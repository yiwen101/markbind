import has from 'lodash/has';
import * as linkProcessor from './linkProcessor';
import * as urlUtil from '../utils/urlUtil';
import type { NodeProcessorConfig } from './NodeProcessor';
import { MbNode } from '../utils/node';
import { is } from 'bluebird';
import { DomElement } from 'domhandler';
import { setHeadingId} from './headerProcessor';

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
    if (!this.config.intrasiteLinkValidation.enabled) {
      return;
    }
    this.intralinkCollection.forEach((resourcePaths, cwf) => {
      resourcePaths.forEach(resourcePath => linkProcessor.validateIntraLink(resourcePath,
                                                                            cwf,
                                                                            this.config,
                                                                            this.filePathToHashesMap));
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

  isHeaderTag(node: MbNode | DomElement): boolean {
    if (node.name === undefined) {
      return false;
    }
    return node.name.startsWith('h') && Number(node.name[1]) >= 1 && Number(node.name[1]) <= 6;
  }

  maintainFilePathToHashesMap(node: MbNode | DomElement, cwf: string) {
    if (!this.config.intrasiteLinkValidation.enabled) {
      return;
    }
    const path = cwf.substring(this.config.rootPath.length);
    if (!this.filePathToHashesMap.has(path)) {
      this.filePathToHashesMap.set(path, new Set());
    }
    if (node.attribs!.id) {
      this.filePathToHashesMap.get(path)!.add(node.attribs!.id);
    }
    /*
    if(path =='/userGuide/tipsAndTricks.md' && this.isHeaderTag(node)) {
      console.log(node.name);
      let header ='';
      node.children.forEach((child) => {
        if(header == '' && child.type == 'text') {
          header = child.data;
        }
      });
      //console.log(node);
      console.log(header.trim());
    }
    if(this.isHeaderTag(node)) {
      let header ='';
      node.children.forEach((child) => {
        if(header != '' && child.type === 'text') {
          header = child.data;
        }
      });
      if(header != '') {
        this.filePathToHashesMap.get(path)!.add(header);
      }
    }
    */
  }

  printFilePathToHashesMap() {
    let result = '';
    this.filePathToHashesMap.forEach((hashes, filePath) => {
      result += `${filePath}:\n`;
      hashes.forEach((hash) => {
        result += `  ${hash}\n`;
      });
    });
    return result;
  }

  maintainInclude(node: MbNode | DomElement, cwf: string) {
    /*
    if (cwf ==`/Users/soc/Desktop/markbind/docs/userGuide/syntax/searchBars.md`){
      console.log(node);
    }
    
    const path = cwf.substring(this.config.rootPath.length);
      if(path == `/userGuide/siteJsonFile.md`) {
        console.log(node);
      }
      */
    if (!this.config.intrasiteLinkValidation.enabled) {
      return;
    }
    if (this.isHeaderTag(node) && node.attribs && !node.attribs.id) {
      setHeadingId(node as MbNode, this.config, true);
      node.attribs.id += `(heading)`
      /*
      const path = cwf.substring(this.config.rootPath.length);
      if(path == `/userGuide/components/popups.md`) {
        console.log(node.attribs.id);
      }
      */
      //console.log(node.attribs.id);
  }
  if (node.attribs&&node.attribs.id) {
    node.attribs.id += `(include)`;
    this.maintainFilePathToHashesMap(node, cwf);
  }
    if(node.children) {
      node.children.forEach((child) => {
        this.maintainInclude(child,cwf);
      });
    }
    
  }
  
}
