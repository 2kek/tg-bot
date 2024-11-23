import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Priority } from '@prisma/client';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  // Получаем все задачи пользователя
  async getAll(userId: string) {
    return this.prisma.task.findMany({
      where: { userId }, // Используем userId для фильтрации задач
    });
  }

  // Получаем задачу по ID для конкретного пользователя
  async getById(id: string, userId: string) {
    return this.prisma.task.findUnique({
      where: { id },
      include: { user: true }, // Включаем данные пользователя для проверки
    });
  }



  // Создаем задачу для конкретного пользователя
  async createTask(name: string, priority: Priority, deadline: Date, userId: string) {
    if (!userId) {
      throw new Error('User ID is required to create a task');
    }
  
    // Создание задачи с привязкой к пользователю
    await this.prisma.task.create({
      data: {
        name,
        priority,
        createdAt: deadline,
        user: {
          connect: { id: userId },
        },
      },
    });
  
    // Возвращаем обновленный список всех задач пользователя
    return this.prisma.task.findMany({
      where: { userId },
    });
  }
  

  // Завершаем задачу, меняя статус
  async doneTask( name: string, userId: string) {
    // Если задача не найдена по ID, ищем по имени
    const task = await this.prisma.task.findFirst({
        where: {
          name: name,
          userId,
        },
      });
  
  
    // Если задача все еще не найдена, возвращаем null
    if (!task) return null;
  
    // Обновляем статус найденной задачи
    await this.prisma.task.update({
      where: { id: task.id },
      data: { isCompleted: !task.isCompleted },
    });
  
    // Возвращаем все задачи пользователя
    return this.getAll(userId);
  }
  

  // Редактируем задачу для конкретного пользователя
  async editTask(name: string, newName: string, userId: string) {
    // Ищем задачу по ID или имени
    const task = await this.prisma.task.findFirst({
      where: {
        OR: [{ id: name }, { name }],
        userId,
      },
    });
  
    if (!task) return null;
  
    // Обновляем имя задачи
    await this.prisma.task.update({
      where: { id: task.id },
      data: { name: newName },
    });
  
    // Возвращаем все задачи пользователя
    return this.getAll(userId);
  }
  

  // Удаляем задачу пользователя
  async deleteTask(identifier: string, userId: string) {
    // Ищем задачу по ID или имени
    const task = await this.prisma.task.findFirst({
      where: {
        OR: [{ id: identifier }, { name: identifier }],
        userId,
      },
    });
  
    if (!task) return null;
  
    // Удаляем задачу
    await this.prisma.task.delete({
      where: { id: task.id },
    });
  
    // Возвращаем все задачи пользователя
    return this.getAll(userId);
  } 
  
}
