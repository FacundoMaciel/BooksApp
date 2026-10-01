export interface CoverImage {
  id: string;
  mimeType: string;
  data: Buffer;
}

export interface CoverRepository {
  save(image: CoverImage): Promise<void>;
  findById(id: string): Promise<CoverImage | undefined>;
}
