"use strict";

const path = require("path");
const each = require("lodash.foreach");
const sum = require("lodash.sumby");
const parse = require("module-details-from-path");
const filesize = require("filesize");

function defaultReport(details) {
    const args = Object.assign({}, details);

    // Sort
    args.totals.sort((a, b) => b.size - a.size);
    console.log("%s:", args.input);

    args.totals.forEach((item) => {
        const itemSize = item.size || 0;

        console.log(
            "%s - %s (%s%%)",
            item.name,
            filesize(itemSize),
            ((itemSize / args.total) * 100).toFixed(2)
        );

        if (args.options.details) {
            args.data[item.name]
                .sort((a, b) => b.size - a.size)
                .forEach((file) => console.log(
                    "\t%s - %s (%s%%)",
                    file.path,
                    filesize(file.size || 0),
                    ((file.size / itemSize) * 100).toFixed(2)
                ));
        }
    });
}

module.exports = (options) => {
    let input, base, report;

    if (!options) {
        options = false;
    }

    report = (options && options.report) || defaultReport;

    return {
        name : "rollup-plugin-sizes",

        // Grab some needed bits out of the options
        options : (config) => {
            input = config.input;
            base = path.dirname(config.input);
        },

        // Spit out stats during bundle generation
        ongenerate : (details) => {
            let total = 0;
            const data = {};
            const totals = [];
            const ids = Object.keys(details.bundle.modules);

            ids.forEach((id) => {
                const module = details.bundle.modules[id];
                let parsed;

                // Handle rollup-injected helpers
                if (id.indexOf("\u0000") === 0) {
                    parsed = {
                        name    : "rollup helpers",
                        basedir : "",
                        path    : id.replace("\u0000", "")
                    };
                } else {
                    parsed = parse(id);

                    if (!parsed) {
                        parsed = {
                            name    : "app",
                            basedir : base,
                            path    : path.relative(base, id)
                        };
                    }
                }

                if (!(parsed.name in data)) {
                    data[parsed.name] = [];
                }

                data[parsed.name].push(Object.assign(parsed, { size : module.originalLength }));
            });

            // Sum all files in each chunk
            each(data, (files, name) => {
                const size = sum(files, "size");

                total += size;

                totals.push({
                    name,
                    size
                });
            });

            report({
                input,
                data,
                totals,
                total,
                options
            });
        }
    };
};
