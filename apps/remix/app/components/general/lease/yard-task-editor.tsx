import type { YardTask } from '@bizrethink/customizations/lease/yard/derive-yard';
import {
  renderYardDuties,
  seedYardTasks,
  unassignedYardTasks,
} from '@bizrethink/customizations/lease/yard/derive-yard';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Button } from '@documenso/ui/primitives/button';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@documenso/ui/primitives/select';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';

/**
 * Who does what in the yard.
 *
 * This was one toggle — "Do you provide lawn service?" — and the split it
 * produced was hard-coded in the clause: landlord mows, tenant waters and
 * keeps the beds. A landlord whose arrangement ran the other way could not say
 * so, and turning the toggle off did not give them a different split. It gave
 * them no clause at all, and a yard nobody had been made responsible for.
 *
 * The preview underneath is the point of the component, not decoration. The
 * defect this replaces was invisible precisely because the allocation lived in
 * clause text nobody read back; showing the sentence as it will be printed is
 * what makes a wrong answer look wrong while it can still be changed.
 */

export type YardTaskEditorProps = {
  tasks: YardTask[];
  onChange: (tasks: YardTask[]) => void;
};

/*
  Radix RESERVES the empty string. Setting a Select's value to '' is how you
  clear it and show the placeholder, so an item may not claim it:

    "A <Select.Item /> must have a value prop that is not an empty string."

  It is a runtime throw inside the item, which means it only fires when a row
  is actually drawn — this shipped, rendered fine on every lease that had no
  yard rows, and took down the first page where somebody pressed "Add a job".

  '' stays the value in the DATA. An unassigned job is a real state and
  `unassignedYardTasks` keys off it. The sentinel exists only for the width of
  this control.
*/
const UNASSIGNED = 'unassigned';

const DOERS: { value: string; label: string }[] = [
  { value: UNASSIGNED, label: 'Not decided' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'landlord', label: 'You' },
  { value: 'association', label: 'The association' },
];

export const YardTaskEditor = ({ tasks, onChange }: YardTaskEditorProps) => {
  const update = (index: number, patch: Partial<YardTask>) => {
    onChange(tasks.map((task, i) => (i === index ? { ...task, ...patch } : task)));
  };

  const unassigned = unassignedYardTasks(tasks);
  const preview = renderYardDuties(tasks);

  return (
    <div className="mt-8 border-t pt-6">
      <h3 className="font-medium text-sm">Yard and landscaping</h3>
      <p className="mt-1 text-muted-foreground text-sm">
        Give each job to somebody. Anything left undecided is a job the lease does not allocate, and the tenant has not
        agreed to do it.
      </p>

      {tasks.length === 0 && (
        <div className="mt-4 rounded-lg border border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm">
            No yard jobs listed. If the property has no outdoor space to speak of, leave this empty and no lawn clause
            is printed.
          </p>
          {/*
            Offered, not only seeded at creation. Every draft started before
            this feature existed has an empty list, and adding six blank rows
            one at a time to retype a list the code already holds is not work
            anybody should be doing.
          */}
          <Button variant="outline" size="sm" className="mt-4" onClick={() => onChange(seedYardTasks())}>
            Start from the usual Florida list
          </Button>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {tasks.map((task, index) => (
          // Index as key: rows have no id and the order is not meaningful.
          <div key={index} className="rounded-lg border p-4">
            <div className="flex items-start gap-4">
              <div className="grid flex-1 gap-4 md:grid-cols-4">
                <div>
                  <Label htmlFor={`yard-task-${index}`}>Job</Label>
                  <Input
                    id={`yard-task-${index}`}
                    value={task.task}
                    placeholder="Palm and tree trimming"
                    onChange={(e) => update(index, { task: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor={`yard-doneby-${index}`}>Done by</Label>
                  <Select
                    value={task.doneBy === '' ? UNASSIGNED : task.doneBy}
                    onValueChange={(next) =>
                      update(index, { doneBy: next === UNASSIGNED ? '' : (next as YardTask['doneBy']) })
                    }
                  >
                    <SelectTrigger id={`yard-doneby-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOERS.map((doer) => (
                        <SelectItem key={doer.value} value={doer.value}>
                          {doer.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor={`yard-frequency-${index}`}>How often</Label>
                  <Input
                    id={`yard-frequency-${index}`}
                    value={task.frequency}
                    placeholder="Twice yearly"
                    onChange={(e) => update(index, { frequency: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor={`yard-notes-${index}`}>What it covers</Label>
                  <Input
                    id={`yard-notes-${index}`}
                    value={task.notes}
                    placeholder="dead fronds and seed heads"
                    onChange={(e) => update(index, { notes: e.target.value })}
                  />
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="mt-6"
                onClick={() => onChange(tasks.filter((_, i) => i !== index))}
                aria-label={`Remove ${task.task || 'this job'}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => onChange([...tasks, { task: '', doneBy: '', frequency: '', notes: '' }])}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add a job
      </Button>

      {preview !== '' && (
        <div className="mt-6 rounded-lg bg-muted/50 p-4">
          <p className="font-medium text-xs uppercase tracking-wide">As the lease will read</p>
          <p className="mt-2 text-sm leading-relaxed">{preview}</p>
        </div>
      )}

      {unassigned.length > 0 && (
        <Alert variant="warning" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Nobody has been given these yet</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
              {unassigned.map((task) => (
                <li key={task}>{task}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm">
              Delete any that do not apply to this property. Anything left here is printed in no clause at all.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
