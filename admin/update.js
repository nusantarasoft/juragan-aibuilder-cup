const fs = require('fs');
let content = fs.readFileSync('src/app/admin/inventory/warehouse-map/page.tsx', 'utf8');

if (!content.includes('import { GlassPanel }')) {
    content = content.replace('import { AuroraText }', 'import { GlassPanel } from "@/components/ui/GlassPanel";\nimport { AuroraText }');
}

const statCardCode = `
    const StatCard = ({
        title,
        value,
        suffix,
        icon,
        gradient,
    }: {
        title: string;
        value: number | string;
        suffix?: string;
        icon: React.ReactNode;
        gradient: string;
    }) => (
        <Card
            size="small"
            style={{
                background: isDark ? "rgba(15, 15, 23, 0.65)" : "rgba(255,255,255,0.75)",
                backdropFilter: "blur(24px)",
                border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.4)",
                boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.02)",
                borderRadius: 16,
                overflow: "hidden",
                position: "relative",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            styles={{ body: { padding: "16px 14px", position: "relative", zIndex: 1 } }}
            hoverable
        >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: gradient, borderRadius: "16px 16px 0 0" }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                    <Typography.Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</Typography.Text>
                    <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2, marginTop: 2, background: gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        {value}{suffix && <span style={{ fontSize: 16 }}>{suffix}</span>}
                    </div>
                </div>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#fff", opacity: 0.85 }}>
                    {icon}
                </div>
            </div>
        </Card>
    );

    return (
`;

if (!content.includes('const StatCard =')) {
    content = content.replace(/[\s\n]+return \([\s\n]*<CMSLayout/m, '\n' + statCardCode + '        <CMSLayout');
}

fs.writeFileSync('src/app/admin/inventory/warehouse-map/page.tsx', content);
