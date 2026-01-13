// Type declarations for non-standard imports

declare module '*.glb' {
    const content: string;
    export default content;
}

declare module '*.gltf' {
    const content: string;
    export default content;
}

declare module '*.png' {
    const content: string;
    export default content;
}

declare module '*.jpg' {
    const content: string;
    export default content;
}

declare module '*.svg' {
    const content: string;
    export default content;
}

// JSX Intrinsic Elements for Three.js/React Three Fiber
declare global {
    namespace JSX {
        interface IntrinsicElements {
            meshLineGeometry: any;
            meshLineMaterial: any;
        }
    }
}
