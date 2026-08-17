import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const PRODUCT_PHOTOS_BUCKET = 'product-photos';

/**
 * Upload de arquivos (fotos de produto, laudos, avatares) pro Supabase
 * Storage. Usa a service role key — só o backend tem acesso de escrita,
 * os arquivos ficam públicos pra leitura (fotos de anúncio não são dados
 * sensíveis).
 */
@Injectable()
export class SupabaseStorageService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private readonly client: SupabaseClient;

  constructor(private readonly config: ConfigService) {
    this.client = createClient(
      this.config.getOrThrow<string>('SUPABASE_URL'),
      this.config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  async onModuleInit() {
    await this.ensureBucket(PRODUCT_PHOTOS_BUCKET);
  }

  private async ensureBucket(bucket: string): Promise<void> {
    const { data: existing } = await this.client.storage.getBucket(bucket);
    if (existing) return;

    const { error } = await this.client.storage.createBucket(bucket, { public: true });
    if (error && !error.message.includes('already exists')) {
      throw error;
    }
    this.logger.log(`Bucket "${bucket}" criado`);
  }

  /** Sobe um arquivo e retorna a URL pública. */
  async uploadPublicFile(
    bucket: string,
    folder: string,
    buffer: Buffer,
    mimetype: string,
    originalName: string,
  ): Promise<string> {
    const extension = originalName.includes('.') ? originalName.split('.').pop() : 'bin';
    const path = `${folder}/${randomUUID()}.${extension}`;

    const { error } = await this.client.storage.from(bucket).upload(path, buffer, {
      contentType: mimetype,
      upsert: false,
    });
    if (error) {
      throw error;
    }

    const { data } = this.client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}

export { PRODUCT_PHOTOS_BUCKET };
