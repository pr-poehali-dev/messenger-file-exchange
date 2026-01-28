import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: dict, context) -> dict:
    """API для управления чатами: создание, получение списка, отправка сообщений"""
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    action = event.get('queryStringParameters', {}).get('action', '')
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        if method == 'POST' and action == 'create':
            body = json.loads(event.get('body', '{}'))
            user_id = body.get('user_id')
            member_ids = body.get('member_ids', [])
            name = body.get('name', '')
            is_group = body.get('is_group', False)
            is_encrypted = body.get('is_encrypted', False)
            
            if not user_id or not member_ids:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'user_id и member_ids обязательны'}),
                    'isBase64Encoded': False
                }
            
            cursor.execute(
                "INSERT INTO chats (name, is_group, is_encrypted) VALUES (%s, %s, %s) RETURNING id",
                (name if is_group else None, is_group, is_encrypted)
            )
            chat_id = cursor.fetchone()['id']
            
            all_members = list(set([user_id] + member_ids))
            for member_id in all_members:
                cursor.execute(
                    "INSERT INTO chat_members (chat_id, user_id) VALUES (%s, %s)",
                    (chat_id, member_id)
                )
            
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'chat_id': chat_id, 'message': 'Чат создан'}),
                'isBase64Encoded': False
            }
        
        elif method == 'GET' and action == 'list':
            user_id = event.get('queryStringParameters', {}).get('user_id')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'user_id обязателен'}),
                    'isBase64Encoded': False
                }
            
            cursor.execute("""
                SELECT 
                    c.id, 
                    c.name, 
                    c.is_group, 
                    c.is_encrypted,
                    (SELECT text FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                    (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
                    (SELECT COUNT(*) FROM messages WHERE chat_id = c.id AND is_read = false AND user_id != %s) as unread_count
                FROM chats c
                INNER JOIN chat_members cm ON c.id = cm.chat_id
                WHERE cm.user_id = %s
                ORDER BY last_message_time DESC NULLS LAST
            """, (user_id, user_id))
            
            chats = cursor.fetchall()
            
            result = []
            for chat in chats:
                cursor.execute("""
                    SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_online
                    FROM users u
                    INNER JOIN chat_members cm ON u.id = cm.user_id
                    WHERE cm.chat_id = %s AND u.id != %s
                """, (chat['id'], user_id))
                members = cursor.fetchall()
                
                chat_dict = dict(chat)
                chat_dict['members'] = [dict(m) for m in members]
                result.append(chat_dict)
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'chats': result}, default=str),
                'isBase64Encoded': False
            }
        
        elif method == 'POST' and action == 'send':
            body = json.loads(event.get('body', '{}'))
            chat_id = body.get('chat_id')
            user_id = body.get('user_id')
            text = body.get('text', '')
            file_url = body.get('file_url')
            file_name = body.get('file_name')
            file_size = body.get('file_size')
            
            if not chat_id or not user_id or (not text and not file_url):
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'chat_id, user_id и текст или файл обязательны'}),
                    'isBase64Encoded': False
                }
            
            cursor.execute(
                "INSERT INTO messages (chat_id, user_id, text, file_url, file_name, file_size) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id, created_at",
                (chat_id, user_id, text, file_url, file_name, file_size)
            )
            message = cursor.fetchone()
            
            cursor.execute("UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = %s", (chat_id,))
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'message_id': message['id'],
                    'created_at': str(message['created_at'])
                }),
                'isBase64Encoded': False
            }
        
        elif method == 'GET' and action == 'messages':
            chat_id = event.get('queryStringParameters', {}).get('chat_id')
            
            if not chat_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'chat_id обязателен'}),
                    'isBase64Encoded': False
                }
            
            cursor.execute("""
                SELECT 
                    m.id, 
                    m.text, 
                    m.file_url, 
                    m.file_name, 
                    m.file_size, 
                    m.created_at, 
                    m.user_id,
                    u.display_name,
                    u.avatar_url
                FROM messages m
                INNER JOIN users u ON m.user_id = u.id
                WHERE m.chat_id = %s
                ORDER BY m.created_at ASC
            """, (chat_id,))
            
            messages = cursor.fetchall()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'messages': [dict(m) for m in messages]}, default=str),
                'isBase64Encoded': False
            }
        
        else:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Эндпоинт не найден'}),
                'isBase64Encoded': False
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
