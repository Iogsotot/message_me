import User from '../../models/user';
import db from '../../lib/db';
import { JWT } from '../../utils/jwt';
import { getBody } from '../../utils/getBody';
import { validateSchema } from '../../lib/schema-validator';
import { DEFAULT_HEADERS } from '../../constants';
import authHeaderParser from '../../next/src/utils/auth-header-parser';

const userSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
    },
    surname: {
      type: 'string',
    },
    login: {
      type: 'string',
    },
    password: {
      type: 'string',
    },
    email: {
      type: 'string',
    },
    phone: {
      type: 'string',
    },
  },
  required: ['name', 'surname', 'login', 'password', 'email'],
};

export const user = new User(db);
export const UserController = {
  async login(req, res) {
    const auth = req.headers.authorization;
    const { type, payload: { login, password } } = authHeaderParser(auth);
    if (type.toLowerCase() === 'basic' && login && password) {
      const userData = await user.login(login, password);
      if (!userData) {
        res.writeHead(401, 'Unknown user', DEFAULT_HEADERS);
        res.end();
        return;
      }
      const accessToken = JWT.generateJWTForUser(userData);
      res.writeHead(200);
      res.write(Buffer.from(JSON.stringify({ accessToken })));
      res.end();
    }
    res.writeHead(401, 'Unknown user', DEFAULT_HEADERS);
    res.end();
  },
  async register(req, res) {
    try {
      const body = await getBody(req);
      const [isValid, errorMessage] = validateSchema(userSchema)(body);
      if (!isValid) {
        res.writeHead(400, 'Invalid body parameters', DEFAULT_HEADERS);
        res.write(Buffer.from(JSON.stringify({ error: errorMessage })));
        res.end();
        return;
      }
      const userDataByLogin = await user.getByLogin(body.login);
      const userDataByEmail = await user.getByEmail(body.email);
      if (userDataByEmail || userDataByLogin) {
        res.writeHead(400, 'User already exists', DEFAULT_HEADERS);
        res.write(Buffer.from(JSON.stringify({ error: 'User already exists' })));
        res.end();
        return;
      }
      await user.create(body);
      res.writeHead(201, 'User created', DEFAULT_HEADERS);
      res.write(JSON.stringify({ created: true }));
      res.end();
    } catch (e) {
      res.writeHead(500, e || 'Unknown Error on POST', DEFAULT_HEADERS);
      res.end();
    }
  },
  async delete(req, res) {
    const authHeader = req.headers.authorization;
    const { type, payload: { id } } = authHeaderParser(authHeader);
    if (type.toLowerCase() !== 'bearer' || !id) {
      res.writeHead(400, 'Invalid token', DEFAULT_HEADERS);
      res.end();
    }
    const userData = await user.getById(id);
    if (userData) await user.delete(id);
  },
};
