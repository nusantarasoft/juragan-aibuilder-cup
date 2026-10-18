/** Logs modules that stay in webpack "building" too long (full admin compile debug). */
class WebpackModuleStallLogger {
  constructor(options = {}) {
    this.intervalMs = options.intervalMs ?? 15_000;
    this.stallSec = options.stallSec ?? 25;
  }

  apply(compiler) {
    const pending = new Map();
    let timer;

    const moduleId = (module) => {
      if (typeof module.resource === "string" && module.resource) {
        return module.resource;
      }
      if (typeof module.identifier === "function") {
        return module.identifier();
      }
      return String(module);
    };

    const shouldLogStart = (id) =>
      id.includes("/admin/src/") ||
      id.includes("node_modules/three") ||
      id.includes("node_modules/@react-three") ||
      id.includes("xenova") ||
      id.includes("face-api");

    compiler.hooks.compilation.tap("WebpackModuleStallLogger", (compilation) => {
      compilation.hooks.buildModule.tap("WebpackModuleStallLogger", (module) => {
        const id = moduleId(module);
        pending.set(id, Date.now());
        if (shouldLogStart(id)) {
          console.log(`[module:start] ${id}`);
        }
      });
      compilation.hooks.succeedModule.tap("WebpackModuleStallLogger", (module) => {
        pending.delete(moduleId(module));
      });
      compilation.hooks.failedModule.tap(
        "WebpackModuleStallLogger",
        (module, err) => {
          const id = moduleId(module);
          console.log(`[module:fail] ${id}`, err?.message || err);
          pending.delete(id);
        },
      );
    });

    compiler.hooks.beforeRun.tap("WebpackModuleStallLogger", () => {
      timer = setInterval(() => {
        const now = Date.now();
        const threshold = this.stallSec * 1000;
        const stuck = [...pending.entries()]
          .filter(([, t]) => now - t >= threshold)
          .sort((a, b) => a[1] - b[1]);
        if (stuck.length) {
          console.log("[module:stall]");
          for (const [id, t] of stuck.slice(0, 10)) {
            console.log(`  ${Math.round((now - t) / 1000)}s  ${id}`);
          }
        }
      }, this.intervalMs);
    });

    const stop = () => {
      if (timer) clearInterval(timer);
    };
    compiler.hooks.done.tap("WebpackModuleStallLogger", stop);
    compiler.hooks.failed.tap("WebpackModuleStallLogger", stop);
  }
}

module.exports = { WebpackModuleStallLogger };
