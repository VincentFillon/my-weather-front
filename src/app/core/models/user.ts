import { Mood } from "./mood";
import { Role } from "./role.enum";

export interface User {
    _id: string;
    username: string;
    displayName: string;
    role: Role;
    image?: string;
    mood?: Mood;
    createdAt?: Date;
    updatedAt?: Date;
    moodUpdatedAt?: Date;
    _v?: number;
}

export interface CreateUserDto {
    username: string;
    password: string;
    displayName: string;
    role: Role;
    image?: string;
    mood?: Mood;
}

export interface UpdateUserDto extends CreateUserDto {
    _id: string;
}
