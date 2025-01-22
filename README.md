# Ma Météo

Ma météo est une application web permettant aux utilisateurs d'indiquer l'état d'humeur dans lequels ils se trouvent.

L'interface se présente sous la forme d'une grille d'humeurs. L'utilisateur, lors de sa première connexion renseigne son nom (ou un pseudonyme) et sera ajouté dans une zone neutre à gauche. Il pourra ensuite glisser/déposer son utilisateur dans la tuile représentant son humeur.

Les utilisateurs on accès à un espace personnel dans lequel ils peuvent modifier leurs informations personnelles (nom, photo de profil, mot de passe) ou supprimer leur compte.

Un espace administrateur est accessible via le `/admin` (uniquement accessible pour les utilisateurs avec le role `admin`). Cet espace permet de modifier et/ou ajouter des humeurs, de gérer les médias (upload/suppression d'images ou de fichiers audios) et de gérer les utilisateurs (modification des infos, assignation de roles ou suppression).
>Lors de l'ajout d'une humeur, on doit renseigner un lien vers une image. On peut y insérer un lien externe ou alors importer l'image dans la gestion des médias et copier le lien pour l'utiliser lors de la création de l'humeur. Il en va de même pour l'URL (optionnelle) du fichier audio.

_**PS:** Il peut être utile de consulter cette météo avant d'entammer une conversation avec un collègue afin d'éviter tout risque de brûlure au 2nd degré par projection de café au visage_ 😁


## Environnement

NodeJS 22.x : [https://nodejs.org/fr/download](https://nodejs.org/fr/download)


## Configuration

1. Installer les dépendances avec la commande :

    ```sh
    npm install
    ```

2. Ouvrez le fichier [src/environments/environment.ts](./src/environments/environment.ts) et remplacez les valeurs des différentes propriétés par celles correspondant à votre environnement :

    ```ts
    export const environment = {
      production: false,
      apiUrl: 'http://localhost:3000',
      wsUrl: 'ws://localhost:3000',
    };
    ```

    > Vous devez également modifier le fichier [src/environments/environment.prod.ts](./src/environments/environment.prod.ts) afin qu'il soit adapté à votre environnement de production

3. Sauvegardez le fichier [src/environments/environment.ts](./src/environments/environment.ts).

4. (Optionnel) Vous pouvez créer un fichier `.env` avec la variable `PORT` pour indiquer le port que vous souhaitez exposer dans le container Docker (cf. [Docker](#docker))


## Développement

Le frontend a été développé sous **Angular**.

Veuillez vous référez à la [documentation](https://angular.dev/) si nécessaire pour mieux comprendre l'architecture d'un projet Angular et les différents outils disponibles pour faciliter le développement.

Pour démarrer le serveur en mode développement (avec live-reload) en local, exécutez la commande suivante :

```sh
npm run start
```

> L'application sera accessible sur [http://localhost:4200/](http://localhost:4200/) depuis un navigateur web. Pour déployer sur un port différent, il faut modifier la commande `"start"` dans le fichier [package.json](./package.json) et ajouter `--port [votre_port]` ou alors lancer directement la commande `ng serve --port [votre-port]`


## Build

Pour compiler les sources du projet, utilisez la commande suivante :

```sh
npm run build
```

>Les sources compilées se trouveront dans le dossier [dist/meteo-front/](./dist/meteo-front/)


## Déploiement

Pour déployer l'application, il suffit de servir les sources compilées depuis un serveur web (apache ou nginx par )exemple. Le point d'entrée est le `index.html` à la racine du dossier généré lors du build.

>⚠️ Attention, l'application utilise le `Router` d'Angular. Il faut donc configurer le serveur de sorte à ce qu'il redirige toutes les requêtes vers le index.html quand le chemin demandé n'existe pas sur le serveur. [En savoir plus](https://v17.angular.io/guide/deployment#server-configuration)


## Docker

Pour construire l'image Docker, utilisez la commande suivante :

```sh
npm run docker:build
```

>Vous pouvez modifier les instructions de construction de l'image Docker dans le fichier [Dockerfile](./Dockerfile).

Pour déployer l'image dans un container Docker, utilisez la commande suivante :

```sh
npm run docker:run
```

Cette commande va démarrer un container nommé `meteo-front` exposé sur le `PORT` défini dans le fichier [.env](./.env). Si vous n'avez pas de fichier `.env` ou qu'il ne comporte pas de variable `PORT` alors le port `4200` sera utilisé par défaut.
