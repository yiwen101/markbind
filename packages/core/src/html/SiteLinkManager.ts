import has from 'lodash/has';
import * as linkProcessor from './linkProcessor';
import type { NodeProcessorConfig } from './NodeProcessor';
import { MbNode } from '../utils/node';

const _ = { has };

const tagsToValidate: Set<string> = new Set([
  'img',
  'pic',
  'thumbnail',
  'a',
  'link',
  'script',
]);

export class SiteLinkManager {
  private config: NodeProcessorConfig;
  private intralinkCollection: Map<string, Set<string>>;
  private filePathToHashesMap: Map<string, Set<string>>;

  constructor(config: NodeProcessorConfig) {
    this.config = config;
    this.intralinkCollection = new Map();
    this.filePathToHashesMap = new Map();
  }

  /**
   * Adds a resourcePath and cwf to the intralinkCollection,
   * ensuring each pair of (resourcePath, cwf) appears only once
   */
  _addToCollection(resourcePath: string, cwf: string) {
    if (!this.intralinkCollection.has(cwf)) {
      this.intralinkCollection.set(cwf, new Set());
    }
    // We have checked and set cwf in intralinkCollection above
    this.intralinkCollection.get(cwf)!.add(resourcePath);
  }

  validateAllIntralinks() {
    //console.log('Validating all intralinks, only called once;');
    if (!this.config.intrasiteLinkValidation.enabled) {
      console.log('Intralink validation is disabled');
      return;
    }

    this.intralinkCollection.forEach((resourcePaths, cwf) => {
      resourcePaths.forEach(resourcePath => linkProcessor.validateIntraLink(resourcePath, cwf, this.config, this.filePathToHashesMap));
    });

    this.intralinkCollection = new Map();
  }

  /**
   * Add a link to the intralinkCollection to be validated later,
   * if the node should be validated and intralink validation is not disabled.
   */
  collectIntraLinkToValidate(node: MbNode, cwf: string) {
    if (!tagsToValidate.has(node.name)) {
      return 'Should not validate';
    }

    const hasIntralinkValidationDisabled = _.has(node.attribs, 'no-validation');
    if (hasIntralinkValidationDisabled) {
      return 'Intralink validation disabled';
    }

    const resourcePath = linkProcessor.getDefaultTagsResourcePath(node);
    if (!resourcePath || !linkProcessor.isIntraLink(resourcePath)) {
      return 'Should not validate';
    }

    this._addToCollection(resourcePath, cwf);
    return 'Intralink collected to be validated later';
  }

  maintainFilePathToHashesMap(node: MbNode, cwf: string) {
    if (!this.config.intrasiteLinkValidation.enabled) {
      return;
    }
    if (!this.filePathToHashesMap.has(cwf)) {
      this.filePathToHashesMap.set(cwf, new Set());
    }
    if (node.attribs.id) {
      this.filePathToHashesMap.get(cwf)!.add(node.attribs.id);
    }
  }
  printHashes() {
    this.filePathToHashesMap.forEach((hashes, filePath) => {
      console.log(filePath);
      hashes.forEach(hash => console.log(`  ${hash}`));
    }
    );
  }
}
