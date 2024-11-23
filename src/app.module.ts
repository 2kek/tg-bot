import { Module } from '@nestjs/common'
import { TelegrafModule } from 'nestjs-telegraf'
import { join } from 'path'
import * as LocalSession from 'telegraf-session-local'
import { AppService } from './app.service'
import { AppUpdate } from './app.update'
import { TG_TOKEN } from './config'
import { PrismaService } from './prisma.service'


const sessions = new LocalSession({ database: 'session_db.json' })

@Module({
	imports: [
		TelegrafModule.forRoot({
			middlewares: [sessions.middleware()],
			token: TG_TOKEN
		}),
	],
	providers: [AppService, AppUpdate, PrismaService]
})
export class AppModule {}
