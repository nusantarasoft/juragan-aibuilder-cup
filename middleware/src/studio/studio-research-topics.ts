/** Seed topics for Riset Knowledge UMKM (editable later via DB/config extension). */
export type StudioResearchTopic = {
    topic_key: string;
    category: string;
    title: string;
    seedUrls: string[];
};

export const STUDIO_RESEARCH_TOPICS: StudioResearchTopic[] = [
    {
        topic_key: 'pph-final-umkm-pp55',
        category: 'pajak',
        title: 'PPh final UMKM 0,5% (PP 55/2022)',
        seedUrls: [
            'https://www.pajak.go.id/artikel/pp-nomor-55-tahun-2022-tentang-pajak-penghasilan',
            'https://www.pajak.go.id/sites/default/files/2022-12/SP-68%202022%20Pemerintah%20Sesuaikan%20Aturan%20Pajak%20Penghasilan.pdf',
        ],
    },
    {
        topic_key: 'nib-oss',
        category: 'regulasi',
        title: 'NIB dan OSS RBA',
        seedUrls: [
            'https://oss.go.id/',
            'https://www.kemenkopukm.go.id/',
        ],
    },
    {
        topic_key: 'sertifikasi-halal',
        category: 'halal',
        title: 'Sertifikasi halal UMKM',
        seedUrls: ['https://halal.go.id/'],
    },
    {
        topic_key: 'kur-pembiayaan',
        category: 'pembiayaan',
        title: 'KUR dan pembiayaan UMKM',
        seedUrls: [
            'https://www.bi.go.id/id/fungsi-utama/sistem-pembayaran/qris/default.aspx',
            'https://www.ojk.go.id/id/kanal/umkm/Pages/default.aspx',
        ],
    },
    {
        topic_key: 'qris-bi',
        category: 'pembayaran',
        title: 'QRIS dan sistem pembayaran BI',
        seedUrls: ['https://www.bi.go.id/id/fungsi-utama/sistem-pembayaran/qris/default.aspx'],
    },
    {
        topic_key: 'pembukuan-keuangan-umkm',
        category: 'pembukuan',
        title: 'Pembukuan dan keuangan UMKM',
        seedUrls: [
            'https://www.kemenkop.go.id/',
            'https://www.kemenkeu.go.id/',
        ],
    },
];
