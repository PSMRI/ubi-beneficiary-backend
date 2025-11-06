import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdatePasswordDTO {
    @IsNotEmpty()
    @IsString()
    username: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    newPassword: string;
}
