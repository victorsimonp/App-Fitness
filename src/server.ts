import Fastify from 'fastify';
import dotenv from 'dotenv';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { createClient } from '@supabase/supabase-js';
import { executarAgenteTreino } from './agent.js';

dotenv.config();

const server = Fastify({
  logger: true 
});

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

server.register(helmet, { contentSecurityPolicy: true });

server.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
});

server.register(rateLimit, {
  max: 60,
  timeWindow: '1 minute',
  errorResponseBuilder: (request, context) => {
    return {
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Ei, devagar! Muitas tentativas de acesso detectadas. Segurança ativa.'
    };
  }
});

server.get('/health', async (request, reply) => {
  return { 
    status: 'ok', 
    message: 'API do Personal IA rodando de forma segura!' 
  };
});

server.post(
  '/cadastro',
  async (request, reply) => {
    try {
      const { name, email, password } = request.body as any;

      server.log.info(`Inserindo usuário direto na tabela: ${email}`);

      const { error: dbError } = await supabase
        .from('usuarios')
        .insert({
          nome: name,
          email: email,
          senha: password
        });

      if (dbError) {
        server.log.error(`[ERRO BANCO] ${dbError.message}`);
        return reply.status(400).send({ error: 'Erro ao salvar no banco', message: dbError.message });
      }

      return reply.status(201).send({ message: 'Cadastro realizado com sucesso!' });
    } catch (error: any) {
      server.log.error(`[ERRO CRÍTICO] ${error.message}`);
      return reply.status(500).send({ error: 'Erro interno no servidor' });
    }
  }
);

server.post(
  '/login',
  {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        }
      }
    }
  },
  async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session) {
        return reply.status(401).send({ error: 'Unauthorized', message: 'Credenciais inválidas.' });
      }

      return { token: data.session.access_token };
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Erro ao processar autenticação.' });
    }
  }
);

server.post(
  '/api/chat/treino', 
  {
    schema: {
      body: {
        type: 'object',
        required: ['mensagem'],
        properties: {
          mensagem: { type: 'string', minLength: 1 },
          historico: { 
            type: 'array',
            items: {
              type: 'object',
              required: ['role', 'content'],
              properties: {
                role: { type: 'string', enum: ['system', 'user', 'assistant'] },
                content: { type: 'string' }
              }
            }
          }
        }
      }
    }
  },
  async (request, reply) => {
    const { mensagem, historico } = request.body as { mensagem: string; historico?: any[] };

    try {
      const respostaAgente = await executarAgenteTreino(mensagem, historico || []);
      return { resposta: respostaAgente };
    } catch (error: any) {
      server.log.error(error);
      return reply.status(500).send({ 
        error: 'Internal Server Error', 
        message: 'Falha de segurança ou processamento ao consultar o agente.' 
      });
    }
  }
);

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3333;
    
    await server.listen({ port, host: '0.0.0.0' });
    
    console.log(`\n[SECURITY ACTIVE] API blindada voando na porta ${port}!`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();