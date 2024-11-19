import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { RegisterUserDto } from './dto/register-user.dto';
import { RpcException } from '@nestjs/microservices';

import * as bcrypt from 'bcrypt';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { envs } from 'src/config/envs';

@Injectable()
export class AuthService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('AuthService')
  
  constructor(
    private readonly jwtService: JwtService
  ) {
    super();
  }
  
  onModuleInit() {
    this.$connect();
    this.logger.log('MongoDB Connected')
  }

  async signJwt(payload: JwtPayload) {
    return this.jwtService.sign(payload)
  }

  async verifyToken(token: string) {
    try {
      
      const { sub, iat, exp, ...user } = this.jwtService.verify(token, { secret: envs.jwtSecret })

      return {
        user: user,
        token: await this.signJwt(user)
      }


    } catch (error) {
      console.log(error);
      throw new RpcException({
        status: 401,
        message: 'Invalid token.'
      })
    }
  }

  async registerUser(registerUserDto: RegisterUserDto) {
    
    const { email, name, password } = registerUserDto
    
    try {
      
      const user = await this.user.findUnique({
        where: {
          email: email
        }
      })

      if (user) {
        throw new RpcException({
          status: 400,
          message: 'User already exists.'
        })
      }

      const newUser = await this.user.create({
        data: {
          email: email,
          password: bcrypt.hashSync(password, 10),
          name: name
        }
      })

      const { password: __, ...rest } = newUser

      return {
        user: rest,
        token: await this.signJwt(rest)
      }

    } catch (error) {
      throw new RpcException({
        status: 400,
        message: error.message
      })
    }

  }


  async loginUser(loginUserDto: LoginUserDto) {
    
    const { email, password } = loginUserDto
    
    try {
      
      const user = await this.user.findUnique({
        where: {
          email: email
        }
      })

      if (!user) {
        throw new RpcException({
          status: 400,
          message: 'User not exists.'
        })
      }

      const isPasswordValid = bcrypt.compareSync(password, user.password)

      if (!isPasswordValid) {
        throw new RpcException({
          status: 400,
          message: 'Password is not valid'
        })
      }

      const { password: __, ...rest } = user;

      return {
        user: rest,
        token: await this.signJwt(rest)
      }

    } catch (error) {
      throw new RpcException({
        status: 400,
        message: error.message
      })
    }

  }

}
