declare module "wx-react-gantt" {
    import { ComponentType } from "react";

    interface GanttScale {
        unit: string;
        step: number;
        format: string;
        css?: (date: Date) => string;
    }

    interface GanttColumn {
        id: string;
        header: string;
        flexgrow?: number;
        width?: number;
        align?: string;
    }

    interface GanttTask {
        id: string | number;
        text: string;
        start: Date;
        duration: number;
        progress?: number;
        parent?: string | number;
        type?: "task" | "summary" | "milestone";
        open?: boolean;
        [key: string]: any;
    }

    interface GanttLink {
        id: string | number;
        source: string | number;
        target: string | number;
        type: string;
    }

    interface GanttProps {
        tasks?: GanttTask[];
        links?: GanttLink[];
        scales?: GanttScale[];
        columns?: GanttColumn[];
        cellWidth?: number;
        cellHeight?: number;
        scaleHeight?: number;
        readonly?: boolean;
        init?: (api: any) => void;
        [key: string]: any;
    }

    export const Gantt: ComponentType<GanttProps>;
}
