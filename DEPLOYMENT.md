# Piloto gratuito na Oracle Cloud

Este guia prepara o portal completo para uma VM Oracle Cloud Always Free. A instalação começa com um banco vazio: nenhum prontuário local, arquivo `.env` de desenvolvimento ou backup existente é enviado para a nuvem.

## O que a configuração prepara

- Portal, API Node.js, MySQL 8.4 e Caddy no mesmo servidor ARM.
- HTTPS automático pelo Caddy após o DNS apontar para o IP público.
- Banco de dados sem porta pública e login `admin/admin` desligado.
- Cadastro protegido por código de convite temporário e limite de tentativas no login.
- Cabeçalhos básicos de segurança no portal e na API.

## Limites da opção sem mensalidade

A oferta Always Free da Oracle inclui até 2 OCPUs ARM e 12 GB de memória, além de cotas limitadas de disco, backups e Object Storage. A VM precisa ser criada na região principal da conta e pode faltar capacidade. A Oracle também pode recolher uma VM gratuita se ela permanecer abaixo dos limites de uso definidos por sete dias. Uma clínica pequena pode ter pouco tráfego, então este plano não garante disponibilidade contínua.

Dados de saúde são sensíveis. Antes de usar prontuários reais, conclua a configuração de HTTPS e senha, configure os backups abaixo e faça uma restauração de teste. Mesmo assim, considere que o servidor gratuito pode ficar indisponível. Não crie recursos que o console marque como pagos; confira o custo estimado antes de confirmar cada recurso.

Referências: [recursos Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm), [regras de inatividade](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm#IdleComputeInstances) e [backups de volume](https://docs.oracle.com/en-us/iaas/Content/Block/Concepts/blockvolumebackups.htm).

## 1. Criar a conta e a VM

1. Crie uma conta Oracle Cloud Free Tier. Escolha como região principal uma região próxima da clínica, se disponível.
2. No console, crie uma VM Ubuntu ARM Ampere A1 Flex com até 2 OCPUs, 12 GB de memória e o disco de inicialização padrão de 50 GB. Confirme que cada recurso aparece como **Always Free** antes de criar.
3. Configure uma chave SSH e guarde a chave privada no computador do responsável. Não compartilhe a chave nem a senha da conta Oracle.
4. No conjunto de segurança da rede da VM, permita entrada TCP nas portas 80 e 443. Restrinja a porta 22 ao IP do responsável sempre que possível. Não abra as portas 3000 ou 3306.

## 2. Criar um endereço gratuito

1. Crie um subdomínio no [DuckDNS](https://www.duckdns.org/) e aponte-o para o IP público da VM.
2. No arquivo `.env.production`, use esse nome completo em `DOMAIN`, por exemplo `minhaclinica.duckdns.org`.
3. Deixe as portas 80 e 443 acessíveis para o Caddy emitir e renovar o certificado HTTPS.

O DuckDNS é um serviço externo gratuito. O domínio próprio `.com.br` pode ser comprado depois, quando o piloto tiver clientes.

## 3. Instalar Docker e copiar os arquivos

No Ubuntu da VM, instale o Docker Engine e o plugin Compose seguindo as instruções oficiais para Ubuntu: <https://docs.docker.com/engine/install/ubuntu/>.

Copie para a VM os arquivos do portal: `app.js`, `index.html`, `style.css`, `server.js`, `schema.sql`, `package.json`, `package-lock.json`, `Dockerfile`, `compose.yaml` e `Caddyfile`. Não envie `.env`, `backups`, `node_modules` ou arquivos de banco locais.

Coloque-os em `/opt/api-terapeuta` e abra essa pasta por SSH.

## 4. Criar segredos e iniciar o sistema

1. Copie `.env.production.example` para `.env.production`.
2. Gere valores diferentes para `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `AUTH_SECRET` e `SIGNUP_INVITE_CODE`. No Ubuntu, `openssl rand -hex 32` cria um valor aleatório de 64 caracteres. Não reutilize a senha do Oracle.
3. Preencha `DOMAIN` com o subdomínio DuckDNS. Restrinja as permissões do arquivo: `chmod 600 .env.production`.
4. Inicie o portal:

   ```sh
   cd /opt/api-terapeuta
   sudo docker compose --env-file .env.production up -d --build
   ```

5. Aguarde o certificado HTTPS e abra o endereço `https://` no celular ou tablet.
6. Use o código de convite para criar a conta da terapeuta. Depois do cadastro, apague o valor de `SIGNUP_INVITE_CODE` em `.env.production` e recrie somente a API:

   ```sh
   sudo docker compose --env-file .env.production up -d --force-recreate api
   ```

Sem o código de convite, novos cadastros ficam fechados. Não deixe o código no arquivo depois de criar a primeira conta.

## 5. Backups e restauração

O Compose mantém o MySQL em um volume persistente, mas isso sozinho não é um backup. Na página do disco de inicialização da VM, atribua uma política personalizada para criar backup diário com retenção de cinco dias. A Oracle informa cinco backups de volume incluídos no Always Free; não acrescente outras políticas ou volumes sem conferir as cotas.

Antes de inserir prontuários reais, faça uma restauração de teste em uma VM temporária também marcada Always Free. Confirme que o portal abre e que os registros de teste aparecem. Repita o teste após mudanças importantes. Guarde também uma cópia das senhas e dos passos de implantação fora da VM.

## Estado e limitações

- A base remota começa vazia. A importação de qualquer dado local ainda depende de autorização e de uma cópia segura.
- Não há recuperação de conta por e-mail, cobrança, suporte operacional ou isolamento para vender contas a clínicas nesta etapa.
- O limite de tentativas do login fica na memória da API e reinicia quando a API reinicia; ele reduz tentativas automatizadas comuns, mas não substitui uma proteção gerenciada.
- Os backups do volume permitem recuperar o servidor, mas não garantem operação sem interrupção. Para uso comercial contínuo, planeje uma hospedagem paga e backups independentes.
