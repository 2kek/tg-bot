import { Priority } from '@prisma/client';
import { Context as ContextTelegraf } from 'telegraf';

export interface Context extends ContextTelegraf {
  session: {
    type?: "done" | "edit" | "remove" | "create" | "token" | "" | "create_priority" | "create_deadline";
    chatId: number;
    taskName: string;
    taskPriority: Priority;
    userId?: string;
    token?: string;
  };

}
