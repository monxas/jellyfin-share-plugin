FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore
RUN dotnet build -c Release -o /out

FROM scratch AS export
COPY --from=build /out/Jellyfin.Plugin.Share.dll /
