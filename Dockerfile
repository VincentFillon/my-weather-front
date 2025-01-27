# Stage 1: Compile and Build angular codebase

# Use the official Node.js image from the Docker Hub
FROM node:22-alpine as build

# Set the working directory
WORKDIR /usr/src/app

# Add the source code to app
COPY . .

# Install all the dependencies
RUN npm install

# Generate the build of the application
RUN npm run build

# Stage 2: Serve app with nginx server

# Use official nginx image as the base image
FROM nginx:latest

# Copy the nginx config file with Angular Router redirection rule.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the build output to replace the default nginx contents.
COPY --from=build /usr/src/app/dist/meteo-front /usr/share/nginx/html

# Expose the port the app runs on
ARG PORT=3006
ENV PORT=${PORT}
EXPOSE ${PORT}
