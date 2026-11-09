# Imagem da api para a demonstração (Render ou qualquer host com Docker).
# O modo pessoal não roda aqui: ele fica na máquina do dono, com o SQLite local.

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY Directory.Build.props nuget.config ./
COPY src/ src/
RUN dotnet publish src/HdsFinance.Api/HdsFinance.Api.csproj -c Release -o /app --nologo

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app .
# A imagem já roda como usuário sem privilégios e escuta na 8080.
ENV ASPNETCORE_HTTP_PORTS=8080 \
    Modo=Demonstracao \
    Proxy__ConfiarNoEncaminhamento=true
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "HdsFinance.Api.dll"]
