declare module 'mammoth' {
    export interface ConversionResult {
        value: string;
        messages: any[];
    }

    export interface ConvertOptions {
        arrayBuffer: ArrayBuffer;
    }

    export function convertToHtml(options: ConvertOptions): Promise<ConversionResult>;
}
