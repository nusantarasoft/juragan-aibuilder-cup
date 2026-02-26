
import React from 'react';
import {
    DatabaseOutlined,
    CloudServerOutlined,
    TableOutlined,
    FolderOutlined,
    FileOutlined,
    BlockOutlined,
    CodeSandboxOutlined
} from "@ant-design/icons";

export const getTypeIcon = (type: string, sourceType?: string) => {
    if (type === 'SPACE' || type === 'HOME') return <BlockOutlined style={{ fontSize: 16, color: '#00bcd4' }} />; // Cyan for spaces
    if (type === 'SOURCE') {
        const normalizedType = (sourceType || '').toUpperCase();
        // Different colors/icons for source types
        if (['S3', 'AWS', 'AWS S3', 'MINIO', 'AZURE_STORAGE', 'AZURE', 'GCS', 'ADLS', 'HDFS', 'NAS', 'FILESYSTEM'].includes(normalizedType)) {
            return <CloudServerOutlined style={{ fontSize: 16, color: '#4caf50' }} />; // Green for storage
        }
        if (['POSTGRES', 'MYSQL', 'ORACLE', 'SQLSERVER', 'MSSQL'].includes(normalizedType)) {
            return <DatabaseOutlined style={{ fontSize: 16, color: '#4caf50' }} />; // Green for DBs
        }
        return <DatabaseOutlined style={{ fontSize: 16, color: '#3f51b5' }} />; // Indigo for catalogs (Nessie)
    }
    if (type === 'FOLDER') {
        return <FolderOutlined style={{ fontSize: 16, color: '#fb8c00' }} />; // Orange for folders
    }
    if (['DATASET', 'PHYSICAL_DATASET', 'VIRTUAL_DATASET', 'DATASET_TABLE', 'DATASET_VIRTUAL', 'FILE'].includes(type)) {
        return <TableOutlined style={{ fontSize: 16, color: '#8b5cf6' }} />; // Violet for tables/files
    }
    return <FileOutlined style={{ fontSize: 16, color: '#9e9e9e' }} />;
};
