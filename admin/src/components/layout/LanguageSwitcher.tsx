import React from 'react';
import { Dropdown } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useLocaleStore } from '@/store/useLocaleStore';

export default function LanguageSwitcher({ isDark }: { isDark: boolean }) {
  const { locale, setLocale } = useLocaleStore();

  const items = [
    {
      key: 'en',
      label: '🇺🇸 English',
      onClick: () => setLocale('en'),
    },
    {
      key: 'id',
      label: '🇮🇩 Bahasa Indonesia',
      onClick: () => setLocale('id'),
    },
  ];

  return (
    <Dropdown menu={{ items, selectedKeys: [locale] }} placement="bottomRight" trigger={['click']}>
      <div style={{
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: '50%',
        transition: 'all 0.2s',
        color: isDark ? '#fff' : '#000',
      }}
      className="hover:bg-gray-200 dark:hover:bg-gray-800"
      >
        <GlobalOutlined style={{ fontSize: 18 }} />
      </div>
    </Dropdown>
  );
}
