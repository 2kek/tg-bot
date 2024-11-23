import {
	Ctx,
	Hears,
	InjectBot,
	Message,
	On,
	Start,
	Update
  } from 'nestjs-telegraf';
  import { Telegraf } from 'telegraf';
  import { actionButtons, priorityButtons  } from './app.buttons';
  import { AppService } from './app.service';
  import { showList } from './app.utils';
  import { Context } from './context.interface';
  import { PrismaService } from './prisma.service';
import { Priority } from '@prisma/client';
  
  @Update()
  export class AppUpdate {
	constructor(
	  @InjectBot() private readonly bot: Telegraf<Context>,
	  private readonly appService: AppService,
	  private readonly prisma: PrismaService
	) {}
  
	@Start()
	async startCommand(@Message('text') message: string, @Ctx() ctx: Context) {
	  if (!ctx.session.token) {
		console.log('Токен не найден, запрашиваем токен...');
		await ctx.reply('Привет друг, введи свой ключ! 👋');
		ctx.session.type = 'token';
	  } else {
		console.log('Токен уже сохранен, продолжаем...');
		const user = await this.prisma.user.findFirst({
		  where: { token: ctx.session.token },
		});
  
		if (!user) {
		  console.log('Токен больше не действителен.');
		  ctx.session.token = null; // Сброс токена
		  ctx.session.type = 'token';
		  await ctx.reply('Сохраненный токен больше не действителен. Введи новый ключ! 👋');
		} else {
		  ctx.session.userId = user.id; // Подтверждаем, что токен валиден
		  await ctx.reply('Добро пожаловать! Токен сохранен, вы можете продолжить работу с задачами.', actionButtons());
		  await ctx.reply('Что ты хочешь сделать?', actionButtons());
		}
	  }
	}
  
	@Hears('⚡️ Создать задачу')
	async createTask(ctx: Context) {
	  if (!ctx.session.userId) {
		await ctx.reply('Необходимо авторизоваться, чтобы создать задачу!');
		return;
	  }
	  ctx.session.type = 'create';
	  await ctx.reply('Опиши задачу: ');
	}
  
	@Hears('📋 Список задач')
	async listTask(ctx: Context) {
	  const userId = ctx.session.userId;
  
	  if (!userId) {
		await ctx.reply('Необходимо авторизоваться для получения списка задач!');
		return;
	  }
  
	  const todos = await this.appService.getAll(userId);
	  await ctx.reply(showList(todos));
	}
  
	@Hears('✅ Завершить')
	async doneTask(ctx: Context) {
	  if (!ctx.session.userId) {
		await ctx.reply('Необходимо авторизоваться, чтобы завершить задачу!');
		return;
	  }
  
	  ctx.session.type = 'done';
	  await ctx.deleteMessage();
	  await ctx.reply('Напиши название задачи: ');
	}
  
	@Hears('✏️ Редактирование')
	async editTask(ctx: Context) {
	  if (!ctx.session.userId) {
		await ctx.reply('Необходимо авторизоваться, чтобы редактировать задачу!');
		return;
	  }
  
	  ctx.session.type = 'edit';
	  await ctx.deleteMessage();
	  await ctx.replyWithHTML(
		'Напиши название и новое название задачи: \n\n' +
		'В формате - <b>1 | Новое название</b>'
	  );
	}
  
	@Hears('❌ Удаление')
	async deleteTask(ctx: Context) {
	  if (!ctx.session.userId) {
		await ctx.reply('Необходимо авторизоваться, чтобы удалить задачу!');
		return;
	  }
  
	  ctx.session.type = 'remove';
	  await ctx.deleteMessage();
	  await ctx.reply('Напиши название задачи: ');
	}
  
	@On('text')
	async getText(@Message('text') message: string, @Ctx() ctx: Context) {
	  if (ctx.session.type === 'token') {
		console.log('Пытаемся найти пользователя по введенному токену...', message);
  
		const user = await this.prisma.user.findFirst({ where: { token: message } });
  
		if (!user) {
		  console.log('Неверный токен');
		  await ctx.reply('Неверный токен, попробуй еще раз.');
		  return;
		}
  
		ctx.session.userId = user.id;
		ctx.session.token = message; // Сохраняем токен
		ctx.session.type = ''; // Сбрасываем тип сессии
  
		console.log('Токен верный! Сессия обновлена с userId:', user.id);
		await ctx.reply(`Токен верный! Уже записал его, теперь можешь пользоваться функционалом платформы!`, actionButtons());
		await ctx.reply('Что ты хочешь сделать?', actionButtons());
		return;
	  }
  
	  const userId = ctx.session.userId;


	  if (!userId) {
		await ctx.reply('Необходимо авторизоваться, чтобы работать с задачами!');
		return;
	  }
  
	  switch (ctx.session.type) {
		case 'create': {
			ctx.session.taskName = message;
			ctx.session.type = 'create_priority';
			await ctx.reply('Выберите приоритет задачи:', priorityButtons());
			break;
		  }
		  case 'create_priority': {
			const priority = message.trim() as Priority;
			ctx.session.taskPriority = priority;
			ctx.session.type = 'create_deadline';
			await ctx.reply('Укажите дедлайн задачи (в формате YYYY-MM-DD): ');
			break;
		  }
		  case 'create_deadline': {
			const deadline = new Date(message.trim());
			const todos = await this.appService.createTask(ctx.session.taskName, ctx.session.taskPriority, deadline, userId);
			await ctx.reply(showList(todos));
			break;
		  }
		case 'done': {
		  const taskName = message.trim();
		  const todos = await this.appService.doneTask(taskName, userId);
  
		  if (!todos) {
			await ctx.deleteMessage();
			await ctx.reply('Задачи с таким ID не найдено!');
			return;
		  }
  
		  await ctx.reply(showList(todos));
		  break;
		}
		case 'edit': {
		  const [taskName, newtaskName] = message.split(' | ').map((str) => str.trim());
		  const todos = await this.appService.editTask(taskName, newtaskName, userId);
  
		  if (!todos) {
			await ctx.deleteMessage();
			await ctx.reply('Задачи с таким ID не найдено!');
			return;
		  }
  
		  await ctx.reply(showList(todos));
		  break;
		}
		case 'remove': {
		  const taskId = message.trim();
		  const todos = await this.appService.deleteTask(taskId, userId);
  
		  if (!todos) {
			await ctx.deleteMessage();
			await ctx.reply('Задачи с таким ID не найдено!');
			return;
		  }
  
		  await ctx.reply(showList(todos));
		  break;
		}
		default: {
		  await ctx.reply('Неизвестный тип сессии.');
		  break;
		}
	  }
	}
  }