function field(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function normalize(value: string, max: number) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 .-]/g, "").toUpperCase().slice(0, max);
}

export function buildPixPayload({ key, name, city, amount, txid }: {
  key: string; name: string; city: string; amount: number; txid: string;
}) {
  const merchantAccount = field("00", "BR.GOV.BCB.PIX") + field("01", key);
  let payload = "";
  payload += field("00", "01");
  payload += field("26", merchantAccount);
  payload += field("52", "0000");
  payload += field("53", "986");
  payload += field("54", amount.toFixed(2));
  payload += field("58", "BR");
  payload += field("59", normalize(name, 25) || "ONZEUP");
  payload += field("60", normalize(city, 15) || "RIO DE JANEIRO");
  payload += field("62", field("05", normalize(txid, 25) || "ONZEUP"));
  payload += "6304";
  return payload + crc16(payload);
}
