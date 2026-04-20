import 'reflect-metadata';
import { initializeTransactionalContext } from 'typeorm-transactional';

process.env.NODE_ENV = 'test';

initializeTransactionalContext();

jest.setTimeout(60_000);
