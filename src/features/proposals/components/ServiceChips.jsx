import { useTranslation } from 'react-i18next';
import { Plus, Camera, ShieldAlert, Settings, DoorOpen, Flame, Phone, Network, Fence } from 'lucide-react';
import { cn } from '../../../lib/utils';

const SERVICE_TEMPLATES = [
  {
    key: 'cctv',
    icon: Camera,
    labelKey: 'form.serviceChips.cctv',
    items: [
      { description: 'IP Kamera', quantity: 1, unit: 'adet', unit_price: 0 },
      { description: 'NVR Kayıt Cihazı', quantity: 1, unit: 'adet', unit_price: 0 },
      { description: 'HDD (Sabit Disk)', quantity: 1, unit: 'adet', unit_price: 0 },
      { description: 'Kablo (Cat6)', quantity: 1, unit: 'metre', unit_price: 0 },
      { description: 'Montaj İşçiliği', quantity: 1, unit: 'adet', unit_price: 0 },
    ],
  },
  {
    key: 'alarm',
    icon: ShieldAlert,
    labelKey: 'form.serviceChips.alarm',
    items: [
      { description: 'Alarm Paneli', quantity: 1, unit: 'adet', unit_price: 0 },
      { description: 'Hareket Dedektörü (PIR)', quantity: 1, unit: 'adet', unit_price: 0 },
      { description: 'Manyetik Kontak', quantity: 1, unit: 'adet', unit_price: 0 },
      { description: 'Siren (İç/Dış)', quantity: 1, unit: 'adet', unit_price: 0 },
      { description: 'Keypad / Tuş Takımı', quantity: 1, unit: 'adet', unit_price: 0 },
      { description: 'Montaj İşçiliği', quantity: 1, unit: 'adet', unit_price: 0 },
    ],
  },
  {
    key: 'maintenance',
    icon: Settings,
    labelKey: 'form.serviceChips.maintenance',
    items: [
      { description: 'Periyodik Bakım Hizmeti', quantity: 1, unit: 'adet', unit_price: 0 },
      { description: 'Sistem Kontrol ve Test', quantity: 1, unit: 'adet', unit_price: 0 },
    ],
  },
  {
    key: 'accessControl',
    icon: DoorOpen,
    labelKey: 'form.serviceChips.accessControl',
    items: [
      { description: 'Geçiş Kontrol Ünitesi', quantity: 1, unit: 'adet', unit_price: 0 },
      { description: 'Kart Okuyucu', quantity: 1, unit: 'adet', unit_price: 0 },
      { description: 'Elektrikli Kilit', quantity: 1, unit: 'adet', unit_price: 0 },
      { description: 'Proximity Kart', quantity: 10, unit: 'adet', unit_price: 0 },
      { description: 'Montaj İşçiliği', quantity: 1, unit: 'adet', unit_price: 0 },
    ],
  },
  {
    key: 'fireDetection',
    icon: Flame,
    labelKey: 'form.serviceChips.fireDetection',
    items: [
      { description: 'Yangın Alarm Paneli', quantity: 1, unit: 'adet', unit_price: 0 },
      { description: 'Duman Dedektörü', quantity: 1, unit: 'adet', unit_price: 0 },
      { description: 'Isı Dedektörü', quantity: 1, unit: 'adet', unit_price: 0 },
      { description: 'Yangın İhbar Butonu', quantity: 1, unit: 'adet', unit_price: 0 },
      { description: 'Montaj İşçiliği', quantity: 1, unit: 'adet', unit_price: 0 },
    ],
  },
  {
    key: 'intercom',
    icon: Phone,
    labelKey: 'form.serviceChips.intercom',
    items: [
      { description: 'Dış Panel (Zil Paneli)', quantity: 1, unit: 'adet', unit_price: 0 },
      { description: 'İç Monitör', quantity: 1, unit: 'adet', unit_price: 0 },
      { description: 'Montaj İşçiliği', quantity: 1, unit: 'adet', unit_price: 0 },
    ],
  },
  {
    key: 'networkCabling',
    icon: Network,
    labelKey: 'form.serviceChips.networkCabling',
    items: [
      { description: 'Cat6 Kablo', quantity: 1, unit: 'metre', unit_price: 0 },
      { description: 'Patch Panel', quantity: 1, unit: 'adet', unit_price: 0 },
      { description: 'Network Switch', quantity: 1, unit: 'adet', unit_price: 0 },
      { description: 'Kablo Kanalı', quantity: 1, unit: 'metre', unit_price: 0 },
      { description: 'İşçilik', quantity: 1, unit: 'adet', unit_price: 0 },
    ],
  },
  {
    key: 'barriers',
    icon: Fence,
    labelKey: 'form.serviceChips.barriers',
    items: [
      { description: 'Bariyer Sistemi', quantity: 1, unit: 'adet', unit_price: 0 },
      { description: 'Kumanda / Kart Okuyucu', quantity: 1, unit: 'adet', unit_price: 0 },
      { description: 'Montaj İşçiliği', quantity: 1, unit: 'adet', unit_price: 0 },
    ],
  },
];

const DEFAULT_ITEM_FIELDS = {
  material_id: null,
  cost: null,
  margin_percent: null,
  product_cost: null,
  labor_cost: null,
  shipping_cost: null,
  material_cost: null,
  misc_cost: null,
};

export function ServiceChips({ onAddItems }) {
  const { t } = useTranslation('proposals');

  const handleClick = (template) => {
    const fullItems = template.items.map((item) => ({
      ...DEFAULT_ITEM_FIELDS,
      ...item,
    }));
    onAddItems(fullItems);
  };

  return (
    <div>
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
        {t('form.serviceChips.title')}
      </p>
      <div className="flex flex-wrap gap-2">
        {SERVICE_TEMPLATES.map((tmpl) => {
          const IconComponent = tmpl.icon;
          return (
            <button
              key={tmpl.key}
              type="button"
              onClick={() => handleClick(tmpl)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
                'border border-neutral-200 dark:border-neutral-700',
                'bg-white dark:bg-neutral-800',
                'text-neutral-700 dark:text-neutral-300',
                'hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700',
                'dark:hover:bg-primary-900/20 dark:hover:border-primary-700 dark:hover:text-primary-300',
                'transition-colors duration-150'
              )}
            >
              <IconComponent className="w-3.5 h-3.5" />
              <span>{t(tmpl.labelKey)}</span>
              <Plus className="w-3 h-3 opacity-50" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
