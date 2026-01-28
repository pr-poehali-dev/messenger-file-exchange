import json
import os
import hashlib
import secrets
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    return secrets.token_urlsafe(32)

def handler(event: dict, context) -> dict:
    """API для авторизации пользователей: регистрация, вход, проверка токена"""
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
    
    path = event.get('queryStringParameters', {}).get('action', '')
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        if method == 'POST' and path == 'register':
            body = json.loads(event.get('body', '{}'))
            username = body.get('username', '').strip()
            email = body.get('email', '').strip()
            password = body.get('password', '')
            display_name = body.get('display_name', username)
            
            if not username or not email or not password:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Все поля обязательны'}),
                    'isBase64Encoded': False
                }
            
            cursor.execute("SELECT id FROM users WHERE username = %s OR email = %s", (username, email))
            if cursor.fetchone():
                return {
                    'statusCode': 409,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Пользователь с таким именем или email уже существует'}),
                    'isBase64Encoded': False
                }
            
            password_hash = hash_password(password)
            token = generate_token()
            
            cursor.execute(
                "INSERT INTO users (username, email, password_hash, display_name, is_online) VALUES (%s, %s, %s, %s, true) RETURNING id, username, email, display_name, avatar_url",
                (username, email, password_hash, display_name)
            )
            user = cursor.fetchone()
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'user': dict(user),
                    'token': token
                }),
                'isBase64Encoded': False
            }
        
        elif method == 'POST' and path == 'login':
            body = json.loads(event.get('body', '{}'))
            username = body.get('username', '').strip()
            password = body.get('password', '')
            
            if not username or not password:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Введите имя пользователя и пароль'}),
                    'isBase64Encoded': False
                }
            
            password_hash = hash_password(password)
            cursor.execute(
                "SELECT id, username, email, display_name, avatar_url FROM users WHERE username = %s AND password_hash = %s",
                (username, password_hash)
            )
            user = cursor.fetchone()
            
            if not user:
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Неверное имя пользователя или пароль'}),
                    'isBase64Encoded': False
                }
            
            cursor.execute("UPDATE users SET is_online = true, last_seen = CURRENT_TIMESTAMP WHERE id = %s", (user['id'],))
            conn.commit()
            
            token = generate_token()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'user': dict(user),
                    'token': token
                }),
                'isBase64Encoded': False
            }
        
        elif method == 'GET' and path == 'users':
            cursor.execute("SELECT id, username, display_name, avatar_url, is_online, last_seen FROM users ORDER BY display_name")
            users = cursor.fetchall()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'users': [dict(u) for u in users]}, default=str),
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
