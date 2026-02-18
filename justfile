default:
    @just --list

dev:
    bun run dev

build:
    bun run build

preview: build
    bun run preview

install:
    bun install

# Build and run the Docker image locally
docker-run: docker-build
    docker run --rm -p 8080:80 home-theor-net

docker-build:
    docker build -t home-theor-net .
