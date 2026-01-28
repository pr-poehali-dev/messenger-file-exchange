import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import AuthForm from '@/components/AuthForm';
import CreateChatDialog from '@/components/CreateChatDialog';
import { toast } from 'sonner';

interface User {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface Chat {
  id: number;
  name: string | null;
  is_group: boolean;
  is_encrypted: boolean;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
  members: User[];
}

interface Message {
  id: number;
  text: string;
  created_at: string;
  user_id: number;
  display_name: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
}

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    if (user) {
      loadChats();
    }
  }, [user]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id);
    }
  }, [selectedChat]);

  const loadChats = async () => {
    try {
      const response = await fetch(`https://functions.poehali.dev/fd643122-8db8-4676-b3bc-a61ac408cc9b/?action=list&user_id=${user?.id}`);
      const data = await response.json();
      setChats(data.chats || []);
      if (data.chats?.length > 0 && !selectedChat) {
        setSelectedChat(data.chats[0]);
      }
    } catch (error) {
      toast.error('Ошибка загрузки чатов');
    }
  };

  const loadMessages = async (chatId: number) => {
    try {
      const response = await fetch(`https://functions.poehali.dev/fd643122-8db8-4676-b3bc-a61ac408cc9b/?action=messages&chat_id=${chatId}`);
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      toast.error('Ошибка загрузки сообщений');
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedChat || !user) return;

    try {
      const response = await fetch('https://functions.poehali.dev/fd643122-8db8-4676-b3bc-a61ac408cc9b/?action=send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: selectedChat.id,
          user_id: user.id,
          text: messageInput
        })
      });

      if (response.ok) {
        setMessageInput('');
        loadMessages(selectedChat.id);
        loadChats();
      } else {
        toast.error('Ошибка отправки сообщения');
      }
    } catch (error) {
      toast.error('Ошибка соединения');
    }
  };

  const getChatName = (chat: Chat) => {
    if (chat.name) return chat.name;
    if (chat.members.length === 1) return chat.members[0].display_name;
    return chat.members.map(m => m.display_name).join(', ');
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.members.length === 1) {
      return chat.members[0].display_name[0];
    }
    return '👥';
  };

  const filteredChats = chats.filter(chat =>
    getChatName(chat).toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return <AuthForm onSuccess={(userData, userToken) => {
      setUser(userData);
      setToken(userToken);
    }} />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="w-80 border-r border-border flex flex-col bg-muted/30">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Чаты</h1>
            <div className="flex items-center gap-2">
              <CreateChatDialog currentUserId={user.id} onChatCreated={loadChats} />
              <Button variant="ghost" size="icon" onClick={() => setShowSidebar(!showSidebar)}>
                <Icon name="Menu" size={20} />
              </Button>
            </div>
          </div>
          
          <div className="relative">
            <Icon name="Search" size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск чатов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Separator />

        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredChats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Нет чатов. Создайте новый!
              </div>
            ) : (
              filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={cn(
                    "w-full p-3 rounded-lg text-left transition-colors hover:bg-accent/50 mb-1",
                    selectedChat?.id === chat.id && "bg-accent/70"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {getChatAvatar(chat)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{getChatName(chat)}</span>
                          {chat.is_encrypted && (
                            <Icon name="Lock" size={12} className="text-muted-foreground" />
                          )}
                        </div>
                        {chat.last_message_time && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(chat.last_message_time).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate">{chat.last_message || 'Нет сообщений'}</p>
                        {chat.unread_count > 0 && (
                          <Badge className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0 text-xs">
                            {chat.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {selectedChat ? (
        <div className="flex-1 flex flex-col">
          <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {getChatAvatar(selectedChat)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">{getChatName(selectedChat)}</h2>
                  {selectedChat.is_encrypted && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Icon name="Shield" size={12} />
                      Зашифровано
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedChat.is_group ? `${selectedChat.members.length + 1} участников` : 'Личный чат'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Icon name="Phone" size={20} />
              </Button>
              <Button variant="ghost" size="icon">
                <Icon name="Video" size={20} />
              </Button>
              <Button variant="ghost" size="icon">
                <Icon name="MoreVertical" size={20} />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.map((message) => {
                const isMine = message.user_id === user.id;
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      isMine ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-md rounded-2xl px-4 py-2 shadow-sm",
                        isMine
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border"
                      )}
                    >
                      {!isMine && (
                        <p className="text-xs font-medium mb-1 opacity-70">{message.display_name}</p>
                      )}
                      {message.file_name && (
                        <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-background/10">
                          <Icon name="FileText" size={20} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{message.file_name}</p>
                            <p className="text-xs opacity-70">
                              {message.file_size ? `${(message.file_size / 1024 / 1024).toFixed(1)} МБ` : 'Файл'}
                            </p>
                          </div>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <Icon name="Download" size={16} />
                          </Button>
                        </div>
                      )}
                      <p className="text-sm">{message.text}</p>
                      <p className={cn(
                        "text-xs mt-1",
                        isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {new Date(message.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="border-t border-border p-4 bg-card">
            <div className="flex items-end gap-2 max-w-4xl mx-auto">
              <Button variant="ghost" size="icon" className="mb-1">
                <Icon name="Paperclip" size={20} />
              </Button>
              <div className="flex-1">
                <Input
                  placeholder="Написать сообщение..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
              </div>
              <Button size="icon" className="mb-1" onClick={sendMessage}>
                <Icon name="Send" size={20} />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Icon name="MessageSquare" size={48} className="mx-auto mb-4 opacity-50" />
            <p>Выберите чат или создайте новый</p>
          </div>
        </div>
      )}

      {showSidebar && (
        <div className="w-80 border-l border-border bg-muted/30 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Профиль</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowSidebar(false)}>
              <Icon name="X" size={20} />
            </Button>
          </div>
          
          <div className="flex flex-col items-center mb-6">
            <Avatar className="w-24 h-24 mb-3">
              <AvatarImage src={user.avatar_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-medium">
                {user.display_name[0]}
              </AvatarFallback>
            </Avatar>
            <h3 className="font-semibold text-lg">{user.display_name}</h3>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
          </div>

          <Separator className="my-6" />

          <nav className="space-y-2">
            <Button variant="ghost" className="w-full justify-start gap-3">
              <Icon name="User" size={18} />
              Настройки профиля
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3">
              <Icon name="Users" size={18} />
              Контакты
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3">
              <Icon name="Folder" size={18} />
              Файлы
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3">
              <Icon name="Settings" size={18} />
              Настройки
            </Button>
            <Separator className="my-4" />
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-destructive hover:text-destructive"
              onClick={() => {
                setUser(null);
                setToken(null);
                setChats([]);
                setSelectedChat(null);
              }}
            >
              <Icon name="LogOut" size={18} />
              Выйти
            </Button>
          </nav>
        </div>
      )}
    </div>
  );
}
