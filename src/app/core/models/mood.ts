export interface Mood {
    _id: string;
    name: string;
    order: number;
    image: string;
    sound?: string;
    createdAt?: Date;
    updatedAt?: Date;
    _v?: number;
}

export interface CreateMoodDto {
    name: string;
    order: number;
    image: string;
    sound?: string;
}

export interface UpdateMoodDto {
    _id: string;
    name?: string;
    order?: number;
    image?: string;
    sound?: string;
}
