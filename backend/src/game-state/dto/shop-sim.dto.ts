import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, Max, Min, ValidateNested } from 'class-validator';
import { SHOP_MAX_STOCK, SHOP_PRODUCTS } from '../shop-sim-engine';

export class ShopPlanItemDto {
  @IsIn(SHOP_PRODUCTS.map((p) => p.id))
  productId: string;

  @IsInt()
  @Min(0)
  @Max(SHOP_MAX_STOCK)
  stock: number;

  @IsInt()
  @Min(1)
  @Max(100_000)
  price: number;
}

export class ShopSimRunDto {
  // 세 가지 버섯의 재고·가격. 범위와 예산은 서버가 한 번 더 확인한다.
  @IsArray()
  @ArrayMinSize(SHOP_PRODUCTS.length)
  @ArrayMaxSize(SHOP_PRODUCTS.length)
  @ValidateNested({ each: true })
  @Type(() => ShopPlanItemDto)
  plan: ShopPlanItemDto[];

  // true면 연습 영업(무작위 하루, 기록·보상 없음)
  @IsOptional()
  @IsBoolean()
  practice?: boolean;
}
