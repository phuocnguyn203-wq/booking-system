function mapRowToRoom(row) {
  return {
    id: row.id,
    name: row.name,
    price_per_night: row.price_per_night,
    created_at: row.created_at,
  };
}
export class RoomRepository {
  constructor(query) {
    this.query = query;
  }

  async findById(id) {
    const result = await this.query(
      `
      SELECT id, name, price_per_night, created_at
      FROM rooms
      WHERE id=$1
      `,
      [id]
    )
    if (result.rows.length === 0)
      return null

    return mapRowToRoom(result.rows[0])
  }
}