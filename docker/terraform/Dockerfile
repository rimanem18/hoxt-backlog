# Ubuntuベースイメージを使用してTerraformとAWS CLI v2をインストール
FROM ubuntu:22.04

# 必要なパッケージのインストール
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    wget \
    gpg \
    lsb-release \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Terraformインストール
RUN wget -O- https://apt.releases.hashicorp.com/gpg | \
    gpg --dearmor | \
    tee /usr/share/keyrings/hashicorp-archive-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
    https://apt.releases.hashicorp.com jammy main" | \
    tee /etc/apt/sources.list.d/hashicorp.list \
    && apt-get update \
    && apt-get install -y terraform=1.6.6-1 \
    && rm -rf /var/lib/apt/lists/*

# AWS CLI v2インストール
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
 && unzip awscliv2.zip \
 && ./aws/install \
 && rm -rf aws awscliv2.zip \
 && aws --version

# 作業ディレクトリ設定
WORKDIR /workspace

# Terraformプラグインキャッシュディレクトリ作成
ENV TF_PLUGIN_CACHE_DIR=/workspace/.terraform.d/plugin-cache
RUN mkdir -p $TF_PLUGIN_CACHE_DIR

# エントリポイント設定
COPY ./docker/terraform/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["terraform", "--help"]
