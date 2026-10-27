import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  type BuildTable,
  type CalculatorState,
  calculateBread,
  DEFAULT_CALCULATOR_STATE,
} from '../lib/bread';

interface BreadCalculatorProps {
  isAdmin: boolean;
}

type GroupKey = keyof CalculatorState;

const fmt1 = (value: number): string => value.toFixed(1);
const fmtHours = (value: number): string => value.toFixed(2);

function NumberField({
  label,
  unit,
  value,
  onChange,
  step = '0.1',
  min = '0',
}: {
  label: string;
  unit?: string;
  value: number;
  onChange: (value: number) => void;
  step?: string;
  min?: string;
}) {
  const id = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <label htmlFor={id} className="text-[13px]">
        {label}
        {unit ? <span className="text-gray-400 dark:text-gray-500"> ({unit})</span> : null}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(Number(event.target.value) || 0)
        }
        className="w-24 rounded-xs border border-gray-300 bg-white px-2 py-1 text-right font-mono text-[13px] text-black focus:outline-2 focus:outline-blue-500 dark:border-[#444444] dark:bg-[#252525] dark:text-[#e0e0e0]"
      />
    </div>
  );
}

function BuildTableDisplay({ table }: { table: BuildTable }) {
  return (
    <table className="w-full text-left text-[13px]">
      <caption className="mb-1 text-left font-semibold">{table.title}</caption>
      <thead>
        <tr className="border-b border-gray-200 dark:border-[#333333]">
          <th scope="col" className="py-1 pr-2 font-medium">
            Ingredient
          </th>
          <th scope="col" className="py-1 pr-2 text-right font-medium">
            %
          </th>
          <th scope="col" className="py-1 text-right font-medium">
            g
          </th>
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row) => (
          <tr key={row.ingredient} className="border-b border-gray-100 dark:border-[#2a2a2a]">
            <th scope="row" className="py-1 pr-2 font-normal">
              {row.ingredient}
            </th>
            <td className="py-1 pr-2 text-right font-mono">{fmt1(row.percent)}</td>
            <td className="py-1 text-right font-mono">{fmt1(row.grams)}</td>
          </tr>
        ))}
        <tr>
          <th scope="row" className="py-1 pr-2 font-semibold">
            Total
          </th>
          <td className="py-1 pr-2 text-right font-mono font-semibold">
            {fmt1(table.totalPercent)}
          </td>
          <td className="py-1 text-right font-mono font-semibold">{fmt1(table.totalGrams)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function Metric({ label, value, ideal }: { label: string; value: number; ideal?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5">
      <span>
        <strong>{label}</strong>
        {ideal ? <span className="text-gray-400 dark:text-gray-500"> ideal {ideal}</span> : null}
      </span>
      <span className="font-mono">{fmt1(value)}</span>
    </div>
  );
}

function FermentationRow({ label, from, to }: { label: string; from: number; to: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5">
      <span>{label}</span>
      <span className="font-mono">
        {fmtHours(from)} – {fmtHours(to)} h
      </span>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="w-full rounded-xs border border-gray-200 bg-white p-4 text-left shadow-sm dark:border-[#333333] dark:bg-[#1c1c1c]">
      <h2 className="mb-2 font-serif text-sm font-bold text-black dark:text-[#f0f0f0]">{title}</h2>
      {children}
    </section>
  );
}

export default function BreadCalculator({ isAdmin }: BreadCalculatorProps) {
  const [state, setState] = useState<CalculatorState>(DEFAULT_CALCULATOR_STATE);
  const result = useMemo(() => calculateBread(state), [state]);

  // Signals that React has hydrated the server-rendered markup. Input events
  // fired before hydration are silently dropped, so tests (and impatient
  // users) must wait for this flag before interacting.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Admin save form state
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateNumber = (group: GroupKey, field: string) => (value: number) => {
    setState((current) => ({
      ...current,
      [group]: { ...current[group], [field]: value },
    }));
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaveError(null);

    try {
      const photoUrls: string[] = [];
      for (const file of photoFiles) {
        const body = new FormData();
        body.append('file', file);
        const uploadRes = await fetch('/api/bakes/upload', { method: 'POST', body });
        const uploadData: unknown = await uploadRes.json();
        if (!uploadRes.ok) {
          const message =
            typeof uploadData === 'object' && uploadData !== null && 'error' in uploadData
              ? String((uploadData as { error: unknown }).error)
              : 'Photo upload failed';
          throw new Error(message);
        }
        photoUrls.push(String((uploadData as { url: string }).url));
      }

      const res = await fetch('/api/bakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, description, notes, formula: state, photos: photoUrls }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const message =
          typeof data === 'object' && data !== null && 'error' in data
            ? String((data as { error: unknown }).error)
            : 'Failed to save bake';
        throw new Error(message);
      }

      const bakeId = String((data as { bake: { id: string } }).bake.id);
      window.location.assign(`/bread/bakes/${encodeURIComponent(bakeId)}`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save bake');
      setSaving(false);
    }
  };

  return (
    <div
      className="flex w-full max-w-2xl flex-col items-stretch gap-4"
      data-hydrated={hydrated ? 'true' : undefined}
    >
      <details className="w-full rounded-xs border border-gray-200 bg-white p-3 text-left text-xs shadow-sm dark:border-[#333333] dark:bg-[#1c1c1c]">
        <summary className="cursor-pointer font-semibold">How to use this calculator</summary>
        <div className="mt-2 space-y-2 text-gray-700 dark:text-[#aaaaaa]">
          <p>Input values in the fields below; everything else is computed live.</p>
          <p>
            <strong>Multiplicative factor</strong> is the ratio of unfermented flour (100) to
            previously fermented flour used as the inoculant in the current fermentative step — it
            also corresponds to the number of doublings in that stage.
          </p>
          <p>
            <strong>Waste factor</strong> is the percentage of extra total dough expected to be lost
            during processing (typically 0–4%).
          </p>
          <p>
            <strong>Pre-fermented flour</strong> is the total flour fermented during the starter
            stages. Typical range for single-stage enriched doughs is 10–33%.
          </p>
          <p>
            <strong>Su</strong> (universal sugar) is total sucrose divided by total dough weight.{' '}
            <strong>Hu</strong> (universal water) is total water (including water contributed by
            ingredients) divided by total dough weight. <strong>Cu</strong> (universal
            concentration) is Su / Hu — an indirect approximation of osmotic stress. Cu values
            between 30 and 40 exert the most stress on sourdough-typical bacteria, with 35 being the
            &ldquo;sweet&rdquo; spot.
          </p>
          <p>
            Fermentation times are estimates and assume a constant 28–30°C. As osmotic stressors
            increase, batch size decreases, and Hu decreases, total fermentation time increases.
          </p>
        </div>
      </details>

      <SectionCard title="Batch">
        <NumberField
          label="Unit weight"
          unit="g"
          value={state.batch.unitWeight}
          onChange={updateNumber('batch', 'unitWeight')}
          step="1"
        />
        <NumberField
          label="Quantity of units"
          unit="ea"
          value={state.batch.quantityOfUnits}
          onChange={updateNumber('batch', 'quantityOfUnits')}
          step="1"
        />
        <NumberField
          label="Waste factor"
          unit="%"
          value={state.batch.wasteFactor}
          onChange={updateNumber('batch', 'wasteFactor')}
        />
        <div className="mt-2 flex items-baseline justify-between border-t border-gray-100 pt-2 dark:border-[#333333]">
          <span className="font-semibold">Batch size (total dough)</span>
          <span className="font-mono font-semibold">{fmt1(result.batchSizeGrams)} g</span>
        </div>
      </SectionCard>

      <div className="grid w-full gap-4 sm:grid-cols-2">
        <SectionCard title="Maintenance Starter Inputs">
          <NumberField
            label="Starter hydration"
            unit="%"
            value={state.maintenanceStarter.starterHydration}
            onChange={updateNumber('maintenanceStarter', 'starterHydration')}
          />
          <NumberField
            label="Multiplicative factor"
            value={state.maintenanceStarter.multiplicativeFactor}
            onChange={updateNumber('maintenanceStarter', 'multiplicativeFactor')}
          />
        </SectionCard>

        <SectionCard title="Dough Starter Inputs">
          <NumberField
            label="Sugar"
            unit="%"
            value={state.doughStarter.sugar}
            onChange={updateNumber('doughStarter', 'sugar')}
          />
          <NumberField
            label="Starter hydration"
            unit="%"
            value={state.doughStarter.starterHydration}
            onChange={updateNumber('doughStarter', 'starterHydration')}
          />
          <NumberField
            label="Multiplicative factor"
            value={state.doughStarter.multiplicativeFactor}
            onChange={updateNumber('doughStarter', 'multiplicativeFactor')}
          />
          <NumberField
            label="Pre-fermented flour"
            unit="%"
            value={state.doughStarter.preFermentedFlour}
            onChange={updateNumber('doughStarter', 'preFermentedFlour')}
          />
        </SectionCard>
      </div>

      <SectionCard title="Total Dough Ingredient Values (% of total flour)">
        <div className="grid gap-x-6 sm:grid-cols-2">
          <div>
            <NumberField
              label="Water"
              unit="%"
              value={state.dough.water}
              onChange={updateNumber('dough', 'water')}
            />
            <NumberField
              label="Milk"
              unit="%"
              value={state.dough.milk}
              onChange={updateNumber('dough', 'milk')}
            />
            <NumberField
              label="Heavy cream"
              unit="%"
              value={state.dough.heavyCream}
              onChange={updateNumber('dough', 'heavyCream')}
            />
            <NumberField
              label="Egg"
              unit="%"
              value={state.dough.egg}
              onChange={updateNumber('dough', 'egg')}
            />
            <NumberField
              label="Egg yolk"
              unit="%"
              value={state.dough.eggYolk}
              onChange={updateNumber('dough', 'eggYolk')}
            />
          </div>
          <div>
            <NumberField
              label="Butter"
              unit="%"
              value={state.dough.butter}
              onChange={updateNumber('dough', 'butter')}
            />
            <NumberField
              label="Sugar"
              unit="%"
              value={state.dough.sugar}
              onChange={updateNumber('dough', 'sugar')}
            />
            <NumberField
              label="Honey"
              unit="%"
              value={state.dough.honey}
              onChange={updateNumber('dough', 'honey')}
            />
            <NumberField
              label="Salt"
              unit="%"
              value={state.dough.salt}
              onChange={updateNumber('dough', 'salt')}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Builds">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <BuildTableDisplay table={result.maintenanceStarter} />
          <BuildTableDisplay table={result.doughStarter} />
          <BuildTableDisplay table={result.finalDough} />
        </div>
      </SectionCard>

      <div className="grid w-full gap-4 sm:grid-cols-2">
        <SectionCard title="Dough Starter Metrics">
          <Metric label="Su" value={result.doughStarterMetrics.su} />
          <Metric label="Hu" value={result.doughStarterMetrics.hu} ideal="28 – 35" />
          <Metric label="Cu" value={result.doughStarterMetrics.cu} ideal="30 – 40" />
        </SectionCard>
        <SectionCard title="Final Dough Metrics">
          <Metric label="Su" value={result.finalDoughMetrics.su} />
          <Metric label="Hu" value={result.finalDoughMetrics.hu} ideal="28 – 35" />
          <Metric label="Cu" value={result.finalDoughMetrics.cu} ideal="25 – 50" />
        </SectionCard>
      </div>

      <SectionCard title="Estimated Fermentation Times (28° to 30°C)">
        <FermentationRow
          label="Maintenance starter"
          from={result.fermentation.maintenanceStarter.fromHours}
          to={result.fermentation.maintenanceStarter.toHours}
        />
        <FermentationRow
          label="Dough starter"
          from={result.fermentation.doughStarter.fromHours}
          to={result.fermentation.doughStarter.toHours}
        />
        <FermentationRow
          label="Bulk"
          from={result.fermentation.bulk.fromHours}
          to={result.fermentation.bulk.toHours}
        />
        <FermentationRow
          label="Proof"
          from={result.fermentation.proof.fromHours}
          to={result.fermentation.proof.toHours}
        />
      </SectionCard>

      {isAdmin ? (
        <SectionCard title="Save this formula as a bake">
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="bake-date" className="text-[13px]">
                Bake date
              </label>
              <input
                id="bake-date"
                type="date"
                required
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="rounded-xs border border-gray-300 bg-white px-2 py-1 font-mono text-[13px] text-black focus:outline-2 focus:outline-blue-500 dark:border-[#444444] dark:bg-[#252525] dark:text-[#e0e0e0]"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="bake-description" className="text-[13px]">
                Description <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="bake-description"
                type="text"
                maxLength={200}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="w-56 rounded-xs border border-gray-300 bg-white px-2 py-1 text-[13px] text-black focus:outline-2 focus:outline-blue-500 dark:border-[#444444] dark:bg-[#252525] dark:text-[#e0e0e0]"
              />
            </div>
            <label htmlFor="bake-notes" className="text-[13px]">
              Notes <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              id="bake-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="rounded-xs border border-gray-300 bg-white px-2 py-1 text-[13px] text-black focus:outline-2 focus:outline-blue-500 dark:border-[#444444] dark:bg-[#252525] dark:text-[#e0e0e0]"
            />
            <label htmlFor="bake-photos" className="text-[13px]">
              Photos <span className="text-gray-400">(optional, up to 10 MB each)</span>
            </label>
            <input
              id="bake-photos"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={(event) => setPhotoFiles(Array.from(event.target.files ?? []))}
              className="text-[13px]"
            />
            {saveError ? (
              <p role="alert" className="text-xs font-semibold text-red-700 dark:text-red-400">
                {saveError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={saving}
              className="self-start rounded-xs border border-gray-800 bg-black px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-gray-800 focus:outline-2 focus:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#555555] dark:bg-[#e0e0e0] dark:text-black dark:hover:bg-white"
            >
              {saving ? 'Saving…' : 'Save bake'}
            </button>
          </form>
        </SectionCard>
      ) : null}
    </div>
  );
}
