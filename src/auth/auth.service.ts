import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { UsersService } from '../users/users.service';

interface GoogleTokenPayload {
  sub: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    this.googleClient = new OAuth2Client(
      configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
    );
  }

  async authenticateWithGoogle(idToken: string): Promise<AuthResponse> {
    const payload = await this.verifyGoogleToken(idToken);

    const user = await this.usersService.findOrCreate({
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
    });

    const accessToken = this.generateJwt(user.id, user.email);

    this.logger.log(`Usuário autenticado: ${user.email}`);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  private async verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();

      if (!payload || !payload.sub || !payload.email || !payload.name) {
        throw new UnauthorizedException('Token Google inválido: dados insuficientes');
      }

      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
      };
    } catch (error) {
      this.logger.warn(`Falha na verificação do token Google: ${(error as Error).message}`);
      throw new UnauthorizedException('Token Google inválido ou expirado');
    }
  }

  private generateJwt(userId: string, email: string): string {
    return this.jwtService.sign(
      { sub: userId, email },
      { expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '7d') },
    );
  }
}
