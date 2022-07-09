FROM denoland/deno:1.23.3

RUN apt-get update && apt-get install -y wget &&\
    wget https://github.com/supabase/cli/releases/download/v0.24.5/supabase_0.24.5_linux_amd64.deb &&\
    dpkg -i supabase_0.24.5_linux_amd64.deb

RUN mkdir /usr/src/app
WORKDIR /usr/src/app


EXPOSE 8080