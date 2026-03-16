# Prioritas Implementasi Big Data / Dremio

1. **Edit Source** – Backend sudah ada (`updateSource`); tambah modal Edit di UI, isi form dari `getSourceDetail`, submit update.

2. **Delete source dari halaman Datasets** – Tambah aksi Delete di tree/browser untuk source, panggil `deleteSource`.

3. **SourceManager** – Pakai sebagai halaman "Data Sources" terpisah (plus Edit) atau hapus jika tidak dipakai.

4. **Pagination hasil SQL** – Parameter offset/limit (atau pageToken) di backend + UI Next/Previous di SQL Runner.

5. **Cancel job** – Ekspos cancel job Dremio di backend + tombol Cancel di UI saat query berjalan.

6. **Update/delete VDS, delete/rename space** – Tambah di backend (Catalog API) lalu aksi di tree/context menu.
