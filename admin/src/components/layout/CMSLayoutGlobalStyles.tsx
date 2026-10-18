"use client";

import type { VOTheme } from "./voTheme";

export function CMSLayoutGlobalStyles({ darkMode, vo }: { darkMode: boolean; vo: VOTheme }) {
    return (
        <style jsx global>{`
                .cms-outer-layout {
                    background: ${vo.canvas} !important;
                }
                .cms-outer-sider,
                .cms-inner-sider {
                    background: ${darkMode ? "rgba(11, 14, 19, 0.96)" : "rgba(255, 255, 255, 0.97)"} !important;
                    border-color: ${vo.border} !important;
                    box-shadow: none !important;
                }

                /* ---- Menus (Agentic OS square rows, monospace, orange active border) ---- */
                .cms-outer-sider .ant-menu,
                .cms-inner-sider .ant-menu {
                    background: transparent !important;
                    color: ${vo.textMuted} !important;
                    border-inline-end: none !important;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                }
                .cms-outer-sider .ant-menu-sub,
                .cms-inner-sider .ant-menu-sub {
                    background: rgba(255, 255, 255, 0.015) !important;
                }
                .cms-outer-sider .ant-menu-item,
                .cms-outer-sider .ant-menu-submenu-title {
                    color: ${vo.text} !important;
                    font-size: 12px !important;
                    font-weight: 500 !important;
                    border: 1px solid transparent !important;
                    border-radius: 0px !important;
                    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease !important;
                    margin-inline: 6px !important;
                    margin-top: 1px !important;
                    margin-bottom: 1px !important;
                    width: calc(100% - 12px) !important;
                    height: 32px !important;
                    line-height: 32px !important;
                    padding-inline: 10px !important;
                }
                .cms-outer-sider .ant-menu-sub .ant-menu-item {
                    height: 29px !important;
                    line-height: 29px !important;
                    font-size: 11.5px !important;
                    padding-left: 28px !important;
                }
                /* Non-clickable domain group header items */
                .cms-outer-sider .ant-menu-item.aos-menu-divider-item,
                .cms-outer-sider .ant-menu-item:has(.vo-divider-header) {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 12px 10px 4px 10px !important;
                    margin: 0 !important;
                    height: auto !important;
                    line-height: 1.2 !important;
                    pointer-events: none !important;
                    cursor: default !important;
                    opacity: 1 !important;
                }
                .cms-outer-sider .ant-menu-item .anticon,
                .cms-outer-sider .ant-menu-submenu-title .anticon {
                    color: ${vo.textDim} !important;
                    transition: color 0.15s ease !important;
                }
                .cms-outer-sider .ant-menu-submenu-arrow {
                    color: ${vo.textDim} !important;
                }
                .cms-outer-sider .ant-menu-item:hover,
                .cms-outer-sider .ant-menu-submenu-title:hover {
                    background: ${vo.hoverBg} !important;
                    border-color: ${vo.border} !important;
                    color: ${vo.text} !important;
                }
                .cms-outer-sider .ant-menu-item:hover .anticon,
                .cms-outer-sider .ant-menu-submenu-title:hover .anticon {
                    color: ${vo.accent} !important;
                }
                .cms-outer-sider .ant-menu-item.ant-menu-item-selected {
                    background: ${vo.selectedBg} !important;
                    border-color: ${vo.selectedBorder} !important;
                    border-left: 2px solid ${vo.accent} !important;
                    color: ${vo.text} !important;
                    font-weight: 600 !important;
                }
                .cms-outer-sider .ant-menu-item.ant-menu-item-selected .anticon,
                .cms-outer-sider .ant-menu-submenu-selected > .ant-menu-submenu-title,
                .cms-outer-sider .ant-menu-submenu-selected > .ant-menu-submenu-title .anticon {
                    color: ${vo.accent} !important;
                }

                /* ---- Segmented Control (Workspace · Context) ---- */
                .cms-inner-sider .ant-segmented {
                    max-width: 100% !important;
                    box-sizing: border-box !important;
                    border-radius: 0px !important;
                }
                .cms-inner-sider .ant-segmented .ant-segmented-item {
                    color: ${vo.textMuted} !important;
                    border-radius: 0px !important;
                    transition: color 0.15s ease !important;
                }
                .cms-inner-sider .ant-segmented .ant-segmented-item:hover:not(.ant-segmented-item-selected) {
                    color: ${vo.text} !important;
                    background: transparent !important;
                }
                .cms-inner-sider .ant-segmented .ant-segmented-item-selected,
                .cms-inner-sider .ant-segmented .ant-segmented-thumb {
                    background: ${vo.selectedBg} !important;
                    color: ${vo.text} !important;
                    box-shadow: inset 0 0 0 1px ${vo.selectedBorder} !important;
                    border-radius: 0px !important;
                }
                .cms-inner-sider .ant-segmented .ant-segmented-item-selected .anticon {
                    color: ${vo.accent} !important;
                }

                /* ---- Agentic OS PageContainer, ProCard, Ant Cards, Tables, Inputs ---- */
                #cms-pro-layout .ant-pro-page-container {
                    background: transparent !important;
                }
                #cms-pro-layout .ant-page-header {
                    background: ${darkMode ? "rgba(11, 14, 19, 0.92)" : "rgba(255, 255, 255, 0.92)"} !important;
                    border-bottom: 1px solid ${vo.border} !important;
                    padding: 6px 12px !important;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                }
                #cms-pro-layout .ant-page-header-heading {
                    margin-block-start: 2px !important;
                }
                #cms-pro-layout .ant-page-header-heading-title {
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                    font-size: 14px !important;
                    font-weight: 700 !important;
                    letter-spacing: 0.08em !important;
                    text-transform: uppercase !important;
                    color: ${vo.text} !important;
                }
                #cms-pro-layout .ant-page-header-heading-sub-title {
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                    font-size: 10.5px !important;
                    color: ${vo.textMuted} !important;
                }
                #cms-pro-layout .ant-breadcrumb {
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                    font-size: 9.5px !important;
                    letter-spacing: 0.12em !important;
                    text-transform: uppercase !important;
                }
                #cms-pro-layout .ant-pro-page-container-children-container,
                #cms-pro-layout .ant-pro-page-container-warp-page-header {
                    padding-inline: 8px !important;
                    padding-block: 8px !important;
                }
                #cms-pro-layout .ant-pro-card,
                #cms-pro-layout .ant-card {
                    background: ${darkMode ? "#0b0e13" : "#ffffff"} !important;
                    border: 1px solid ${vo.border} !important;
                    border-radius: 0px !important;
                    box-shadow: none !important;
                    backdrop-filter: none !important;
                    -webkit-backdrop-filter: none !important;
                    transform: none !important;
                }
                /* Eliminate redundant outer wrapper ProCard padding/border around page children */
                #cms-pro-layout .ant-pro-page-container-children-container > .ant-pro-card {
                    background: transparent !important;
                    border: none !important;
                }
                #cms-pro-layout .ant-pro-page-container-children-container > .ant-pro-card > .ant-pro-card-body {
                    padding: 0px !important;
                }
                #cms-pro-layout .ant-card-head,
                #cms-pro-layout .ant-pro-card-header {
                    border-bottom: 1px solid ${vo.border} !important;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                }
                #cms-pro-layout .ant-card-head-title,
                #cms-pro-layout .ant-pro-card-title {
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                    font-size: 11px !important;
                    font-weight: 600 !important;
                    letter-spacing: 0.16em !important;
                    text-transform: uppercase !important;
                }
                #cms-pro-layout .ant-table-wrapper .ant-table {
                    background: transparent !important;
                    border-radius: 0px !important;
                }
                #cms-pro-layout .ant-table-thead > tr > th {
                    background: ${darkMode ? "rgba(255, 255, 255, 0.025)" : "rgba(15, 23, 42, 0.03)"} !important;
                    color: ${vo.textMuted} !important;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                    font-size: 10px !important;
                    font-weight: 600 !important;
                    letter-spacing: 0.16em !important;
                    text-transform: uppercase !important;
                    border-bottom: 1px solid ${vo.borderStrong} !important;
                    border-radius: 0px !important;
                }
                #cms-pro-layout .ant-table-tbody > tr > td {
                    border-bottom: 1px solid ${vo.border} !important;
                    font-size: 12px !important;
                }
                #cms-pro-layout .ant-table-tbody > tr:hover > td {
                    background: ${vo.hoverBg} !important;
                }
                #cms-pro-layout .ant-btn,
                #cms-pro-layout .ant-input,
                #cms-pro-layout .ant-input-affix-wrapper,
                #cms-pro-layout .ant-select-selector,
                #cms-pro-layout .ant-tag,
                #cms-pro-layout .ant-modal-content {
                    border-radius: 0px !important;
                }
                #cms-pro-layout .ant-tag {
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                    font-size: 10px !important;
                    letter-spacing: 0.08em !important;
                    text-transform: uppercase !important;
                }

                /* VO IconButton (footer actions) */
                .vo-icon-btn {
                    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease !important;
                }
                .vo-icon-btn:hover {
                    background: ${vo.selectedBg} !important;
                    border-color: ${vo.selectedBorder} !important;
                    color: ${vo.text} !important;
                }

                /* Align PageContainer title and subtitle by baseline */
                .ant-page-header-heading-left {
                    align-items: baseline !important;
                }

                /* ---- Tactical HUD Tooltips & Popconfirm (Dark + Light Mode) ---- */
                .ant-tooltip {
                    max-width: 300px !important;
                }
                .ant-tooltip .ant-tooltip-inner {
                    background: ${darkMode ? "#0b0e13" : "#ffffff"} !important;
                    color: ${vo.text} !important;
                    border: 1px solid ${vo.borderStrong} !important;
                    border-left: 2px solid ${vo.accent} !important;
                    border-radius: 0px !important;
                    box-shadow: ${darkMode
                        ? "0 8px 24px rgba(0, 0, 0, 0.72)"
                        : "0 6px 18px rgba(15, 23, 42, 0.14)"} !important;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                    font-size: 10.5px !important;
                    font-weight: 500 !important;
                    letter-spacing: 0.04em !important;
                    line-height: 1.35 !important;
                    padding: 4px 8px !important;
                    min-height: 24px !important;
                }
                .ant-tooltip .ant-tooltip-arrow::before,
                .ant-tooltip .ant-tooltip-arrow::after {
                    background: ${darkMode ? "#0b0e13" : "#ffffff"} !important;
                    border-color: ${vo.borderStrong} !important;
                }
                .ant-popover .ant-popover-inner {
                    background: ${darkMode ? "#0b0e13" : "#ffffff"} !important;
                    color: ${vo.text} !important;
                    border: 1px solid ${vo.borderStrong} !important;
                    border-top: 2px solid ${vo.accent} !important;
                    border-radius: 0px !important;
                    box-shadow: ${darkMode
                        ? "0 10px 28px rgba(0, 0, 0, 0.75)"
                        : "0 8px 22px rgba(15, 23, 42, 0.14)"} !important;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                }
                .ant-popover .ant-popover-title,
                .ant-popconfirm .ant-popconfirm-title,
                .ant-popconfirm .ant-popconfirm-description {
                    color: ${vo.text} !important;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                    font-size: 11px !important;
                }
                .ant-popover .ant-btn {
                    border-radius: 0px !important;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                    font-size: 10.5px !important;
                }
        `}</style>
    );
}
