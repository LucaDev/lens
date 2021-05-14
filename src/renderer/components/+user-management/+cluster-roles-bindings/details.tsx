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

import "./details.scss";

import { observable, reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";

import type { ClusterRoleBinding, ClusterRoleBindingSubject } from "../../../api/endpoints";
import { autoBind, prevDefault } from "../../../utils";
import { AddRemoveButtons } from "../../add-remove-buttons";
import { ConfirmDialog } from "../../confirm-dialog";
import { DrawerTitle } from "../../drawer";
import type { KubeObjectDetailsProps } from "../../kube-object";
import { KubeObjectMeta } from "../../kube-object/kube-object-meta";
import { Table, TableCell, TableHead, TableRow } from "../../table";
import { AddClusterRoleBindingDialog } from "./add-dialog";
import { clusterRoleBindingsStore } from "./store";

interface Props extends KubeObjectDetailsProps<ClusterRoleBinding> {
}

@observer
export class ClusterRoleBindingDetails extends React.Component<Props> {
  @observable selectedSubjects = observable.array<ClusterRoleBindingSubject>([], { deep: false });

  constructor(props: Props) {
    super(props);
    autoBind(this);
  }

  async componentDidMount() {
    disposeOnUnmount(this, [
      reaction(() => this.props.object, () => {
        this.selectedSubjects.clear();
      })
    ]);
  }

  selectSubject(subject: ClusterRoleBindingSubject) {
    const { selectedSubjects } = this;
    const isSelected = selectedSubjects.includes(subject);

    selectedSubjects.replace(
      isSelected
        ? selectedSubjects.filter(sub => sub !== subject) // unselect
        : selectedSubjects.concat(subject) // select
    );
  }

  removeSelectedSubjects() {
    const { object: roleBinding } = this.props;
    const { selectedSubjects } = this;

    ConfirmDialog.open({
      ok: () => clusterRoleBindingsStore.updateSubjects({ roleBinding, removeSubjects: selectedSubjects }),
      labelOk: `Remove`,
      message: (
        <p>Remove selected bindings for <b>{roleBinding.getName()}</b>?</p>
      )
    });
  }

  render() {
    const { selectedSubjects } = this;
    const { object: roleBinding } = this.props;

    if (!roleBinding) {
      return null;
    }
    const { roleRef } = roleBinding;
    const subjects = roleBinding.getSubjects();

    return (
      <div className="RoleBindingDetails">
        <KubeObjectMeta object={roleBinding}/>

        <DrawerTitle title="Reference"/>
        <Table>
          <TableHead>
            <TableCell>Kind</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>API Group</TableCell>
          </TableHead>
          <TableRow>
            <TableCell>{roleRef.kind}</TableCell>
            <TableCell>{roleRef.name}</TableCell>
            <TableCell>{roleRef.apiGroup}</TableCell>
          </TableRow>
        </Table>

        <DrawerTitle title="Bindings"/>
        {subjects.length > 0 && (
          <Table selectable className="bindings box grow">
            <TableHead>
              <TableCell checkbox/>
              <TableCell className="binding">Binding</TableCell>
              <TableCell className="type">Type</TableCell>
            </TableHead>
            {
              subjects.map((subject, i) => {
                const { kind, name } = subject;
                const isSelected = selectedSubjects.includes(subject);

                return (
                  <TableRow
                    key={i}
                    selected={isSelected}
                    onClick={prevDefault(() => this.selectSubject(subject))}
                  >
                    <TableCell checkbox isChecked={isSelected}/>
                    <TableCell className="binding">{name}</TableCell>
                    <TableCell className="type">{kind}</TableCell>
                  </TableRow>
                );
              })
            }
          </Table>
        )}

        <AddRemoveButtons
          onAdd={() => AddClusterRoleBindingDialog.open(roleBinding)}
          onRemove={selectedSubjects.length ? this.removeSelectedSubjects : null}
          addTooltip={`Add bindings to ${roleRef.name}`}
          removeTooltip={`Remove selected bindings from ${roleRef.name}`}
        />
      </div>
    );
  }
}
