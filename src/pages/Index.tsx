import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface Chat {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  encrypted: boolean;
}

interface Message {
  id: number;
  text: string;
  time: string;
  isMine: boolean;
  fileUrl?: string;
  fileName?: string;
}

const mockChats: Chat[] = [
  { id: 1, name: 'Анна Смирнова', avatar: '', lastMessage: 'Отправила документ', time: '14:32', unread: 2, online: true, encrypted: true },
  { id: 2, name: 'Команда проекта', avatar: '', lastMessage: 'Максим: Всё готово к деплою', time: '13:15', unread: 0, online: false, encrypted: false },
  { id: 3, name: 'Дмитрий Павлов', avatar: '', lastMessage: 'Когда созвон?', time: '11:47', unread: 1, online: true, encrypted: true },
  { id: 4, name: 'Мария Козлова', avatar: '', lastMessage: 'Спасибо за помощь!', time: 'Вчера', unread: 0, online: false, encrypted: false },
  { id: 5, name: 'Александр Петров', avatar: '', lastMessage: 'Посмотри презентацию', time: 'Вчера', unread: 0, online: true, encrypted: true },
];

const mockMessages: Message[] = [
  { id: 1, text: 'Привет! Как дела с проектом?', time: '14:20', isMine: false },
  { id: 2, text: 'Всё отлично, почти закончил', time: '14:25', isMine: true },
  { id: 3, text: 'Отправляю последние файлы', time: '14:30', isMine: false, fileUrl: '#', fileName: 'project_docs.pdf' },
  { id: 4, text: 'Супер, спасибо!', time: '14:32', isMine: true },
];

export default function Index() {
  const [selectedChat, setSelectedChat] = useState<Chat>(mockChats[0]);
  const [messages] = useState<Message[]>(mockMessages);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);

  const filteredChats = mockChats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="w-80 border-r border-border flex flex-col bg-muted/30">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Чаты</h1>
            <Button variant="ghost" size="icon" onClick={() => setShowSidebar(!showSidebar)}>
              <Icon name="Menu" size={20} />
            </Button>
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
            {filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={cn(
                  "w-full p-3 rounded-lg text-left transition-colors hover:bg-accent/50 mb-1",
                  selectedChat.id === chat.id && "bg-accent/70"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={chat.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {chat.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    {chat.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{chat.name}</span>
                        {chat.encrypted && (
                          <Icon name="Lock" size={12} className="text-muted-foreground" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{chat.time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                      {chat.unread > 0 && (
                        <Badge className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0 text-xs">
                          {chat.unread}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={selectedChat.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {selectedChat.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{selectedChat.name}</h2>
                {selectedChat.encrypted && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Icon name="Shield" size={12} />
                    Зашифровано
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedChat.online ? 'В сети' : 'Не в сети'}
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
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.isMine ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-md rounded-2xl px-4 py-2 shadow-sm",
                    message.isMine
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border"
                  )}
                >
                  {message.fileName && (
                    <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-background/10">
                      <Icon name="FileText" size={20} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{message.fileName}</p>
                        <p className="text-xs opacity-70">PDF • 2.4 МБ</p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Icon name="Download" size={16} />
                      </Button>
                    </div>
                  )}
                  <p className="text-sm">{message.text}</p>
                  <p className={cn(
                    "text-xs mt-1",
                    message.isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    {message.time}
                  </p>
                </div>
              </div>
            ))}
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
                className="resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    setMessageInput('');
                  }
                }}
              />
            </div>
            <Button size="icon" className="mb-1">
              <Icon name="Send" size={20} />
            </Button>
          </div>
        </div>
      </div>

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
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-medium">
                ВИ
              </AvatarFallback>
            </Avatar>
            <h3 className="font-semibold text-lg">Вы</h3>
            <p className="text-sm text-muted-foreground">@your_username</p>
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
          </nav>
        </div>
      )}
    </div>
  );
}
