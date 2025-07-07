export interface Mood {
    _id: string;
    name: string;
    order: number;
    image: string;
    color: string;
    sound?: string;
    backgroundImg?: string; // Nouvelle propriété pour l'image de fond
    createdAt?: Date;
    updatedAt?: Date;
    _v?: number;
}

export interface CreateMoodDto {
    name: string;
    order: number;
    image: string;
    color?: string;
    sound?: string;
}

export interface UpdateMoodDto {
    _id: string;
    name?: string;
    order?: number;
    image?: string;
    color?: string;
    sound?: string;
}
