# gta-v-vehicles

Toolset for extracting vehicle data from GTA V installation.

## Dependency

* Grand Theft Auto V
* [rage-cli](https://github.com/VIRUXE/rage-cli)
* [bun](https://bun.com)
* [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)

## Usage

### Config

Assign GTA installation path to envar `GTA_ROOT`. Overwrite order written in `list/out.txt`. Newly added DLCs should be appended to `list_out.txt` or otherwise it will be ignored when merging.

### Run

Extract:

```bash
$ ./extract.sh
```

Note: `.ymt` files will need to be decrypted before merging. There is no convenient way to do it. Using tools like OpenIV is recommended.

Merge:

```bash
$ bun merge.js
```

## LICENSE

This project is distributed under [MIT](LICENSE) license.
