/**
 * Copyright (c) 2021 OpenLens Authors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { ApisApi, KubeConfig, V1APIResourceList } from "@kubernetes/client-node";
import got from "got";
import { ExtendedMap } from "../../common/utils";

export interface ApiResource {
  name: string,
  singularName: string,
  namespaced: boolean,
  kind: string,
  verbs: Set<string>,
  shortNames: Set<string>,
}

/**
 * Mapping between groupVersions and resource names and their information
 */
export type ApiResourceMap = Map<string, Map<string, ApiResource>>;

export async function getClusterResources(kc: KubeConfig): Promise<ApiResourceMap> {
  const api = kc.makeApiClient(ApisApi);
  const { body: apiGroups } = await api.getAPIVersions();
  const promises: Promise<V1APIResourceList>[] = [
    // This is the legacy APIs
    got.get(`${kc.getCurrentCluster().server}/api/v1`).json<V1APIResourceList>(),
  ];

  for (const apiGroup of apiGroups.groups) {
    for (const { groupVersion } of apiGroup.versions) {
      promises.push(got.get(`${kc.getCurrentCluster().server}/apis/${groupVersion}`).json<V1APIResourceList>());
    }
  }

  const apiResourceLists = await Promise.all(promises);
  const res = new ExtendedMap<string, ExtendedMap<string, ApiResource>>();

  for (const apiResourceList of apiResourceLists) {
    const versions = res.getOrInsert(apiResourceList.groupVersion, ExtendedMap.new);

    for (const resource of apiResourceList.resources) {
      versions.strictSet(resource.name, {
        name: resource.name,
        singularName: resource.singularName,
        namespaced: resource.namespaced,
        kind: resource.kind,
        verbs: new Set(resource.verbs),
        shortNames: new Set(resource.shortNames),
      });
    }
  }

  return res;
}
