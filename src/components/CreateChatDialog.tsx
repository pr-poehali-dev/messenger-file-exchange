import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';

interface User {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_online: boolean;
}

interface CreateChatDialogProps {
  currentUserId: number;
  onChatCreated: () => void;
}

export default function CreateChatDialog({ currentUserId, onChatCreated }: CreateChatDialogProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [chatName, setChatName] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('https://functions.poehali.dev/8f64e9d4-fc74-4450-bcbc-91258eeea448/?action=users');
      const data = await response.json();
      setUsers(data.users.filter((u: User) => u.id !== currentUserId));
    } catch (error) {
      toast.error('Ошибка загрузки пользователей');
    }
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Выберите хотя бы одного участника');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('https://functions.poehali.dev/fd643122-8db8-4676-b3bc-a61ac408cc9b/?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          member_ids: selectedUsers,
          name: chatName || null,
          is_group: selectedUsers.length > 1,
          is_encrypted: isEncrypted
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Чат создан!');
        setOpen(false);
        setSelectedUsers([]);
        setChatName('');
        onChatCreated();
      } else {
        toast.error(data.error || 'Ошибка создания чата');
      }
    } catch (error) {
      toast.error('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" className="rounded-full">
          <Icon name="Plus" size={20} />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Создать чат</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {selectedUsers.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="chatName">Название группы</Label>
              <Input
                id="chatName"
                placeholder="Введите название..."
                value={chatName}
                onChange={(e) => setChatName(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="encrypted"
              checked={isEncrypted}
              onCheckedChange={(checked) => setIsEncrypted(checked as boolean)}
            />
            <Label htmlFor="encrypted" className="flex items-center gap-2 cursor-pointer">
              <Icon name="Lock" size={16} />
              Зашифрованный чат
            </Label>
          </div>

          <div className="space-y-2">
            <Label>Выберите участников</Label>
            <ScrollArea className="h-64 border rounded-lg p-2">
              <div className="space-y-1">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className={`w-full p-2 rounded-lg flex items-center gap-3 hover:bg-accent transition-colors ${
                      selectedUsers.includes(user.id) ? 'bg-accent' : ''
                    }`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user.display_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{user.display_name}</p>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                    {selectedUsers.includes(user.id) && (
                      <Icon name="Check" size={18} className="text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Button onClick={handleCreate} className="w-full" disabled={loading}>
            {loading ? 'Создание...' : 'Создать чат'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
