import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOrderCancellationMetadataColumns1764500000000 implements MigrationInterface {
  name = 'AddOrderCancellationMetadataColumns1764500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('orders', [
      new TableColumn({
        name: 'cancelledAt',
        type: 'timestamptz',
        isNullable: true,
      }),
      new TableColumn({
        name: 'cancellationReason',
        type: 'varchar',
        length: '512',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('orders', [
      'cancellationReason',
      'cancelledAt',
    ]);
  }
}
