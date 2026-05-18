import { useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CalendarCheck2, Copy, Edit, Heart, Mail, Maximize2, Share2, Download, Users } from "lucide-react";
import { useDashboard } from "@/lib/dashboard-store";
import { type Property } from "@/lib/dashboard-data";
import {
  createPropertyAppointment,
  fetchPropertyDetails,
  saveFavoriteProperty,
  shareProperty,
  updateProperty as updatePropertyRecord,
} from "@/lib/property-api";
import {
  AMENITY_OPTIONS,
  APPRECIATION_OPTIONS,
  AREA_UNIT_OPTIONS,
  BALCONY_OPTIONS,
  BEDROOM_OPTIONS,
  createDefaultPropertyForm,
  FACING_OPTIONS,
  FURNISHING_OPTIONS,
  generateMockAiSummary,
  getAreasByCity,
  getCitiesByCountry,
  getCurrencyByCountry,
  getCurrencySymbolByCountry,
  getExactPricePlaceholderByCountry,
  getPriceRangesByCountry,
  formatPropertyPrice,
  INVESTOR_FIT_OPTIONS,
  LISTING_STATUS,
  LISTING_TYPES,
  PAYMENT_PLAN_OPTIONS,
  PARKING_OPTIONS,
  POSSESSION_OPTIONS,
  PRIORITY_OPTIONS,
  PROPERTY_CATEGORIES,
  PROPERTY_COUNTRIES,
  PROPERTY_TYPE_BY_CATEGORY,
  RISK_OPTIONS,
  RERA_STATUS,
  FLOOR_OPTIONS,
  TAG_OPTIONS,
  UNIT_OPTIONS,
  validatePropertyForm,
  type PropertyFormData,
  VISIBILITY_OPTIONS,
  OWNERSHIP_TYPES,
  VERIFICATION_STATUS,
} from "@/lib/property-form-utils";

const BROKERS = ["Aarav Mehta", "Sophia Khan", "Noah Williams", "Mia Johnson", "Daniel Shah"];
const BATHROOM_OPTIONS = ["1", "2", "3", "4", "5+", "Not Applicable"];
const FALLBACK_PROPERTY_IMAGE = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80";
const DEFAULT_NEARBY_LABELS = ["School Nearby", "Hospital Nearby", "Metro Nearby", "Mall Nearby", "Airport Access"];

function getPropertyLink(property: Property) {
  if (typeof window === "undefined") {
    return `https://realestateos.local/properties/${property.id}`;
  }
  return `${window.location.origin}/properties/${property.id}`;
}

function getPropertyPriceLabel(property: Property) {
  const currency = property.currency || getCurrencyByCountry(property.country);
  const exact = property.price?.trim();
  if (exact) {
    const numeric = exact.replace(/[^\d.]/g, "");
    if (numeric && !/[a-zA-Z]/.test(exact)) {
      return formatPropertyPrice(numeric, currency);
    }
    return exact;
  }
  if (property.priceRange) return `${currency} ${property.priceRange}`;
  return `On request ${currency}`;
}

function getPropertyNearbyPlaces(property: Property) {
  const nearby = property.nearbyPlaces || [];
  if (nearby.length > 0) return nearby;
  return DEFAULT_NEARBY_LABELS;
}

function getPropertyLocationAdvantages(property: Property) {
  if (property.locationAdvantages && property.locationAdvantages.length) return property.locationAdvantages;
  const advantages = [
    property.area ? `Located in ${property.area}` : null,
    property.city ? `Strong demand in ${property.city}` : null,
    property.country ? `${property.country} market exposure` : null,
  ].filter(Boolean) as string[];
  return advantages.length ? advantages : ["Prime residential and investment access"];
}

function getPropertyBestBuyerType(property: Property) {
  return property.bestBuyerType || property.investorFit || property.propertyType || "Investor";
}

function formatPriceWithUnit(value?: string, unit?: string) {
  if (!value) return "Not specified";
  return unit ? `${value} / ${unit}` : value;
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(value: string[] | undefined) {
  return (value || []).join("\n");
}

function toPropertyForm(property?: Property | null): PropertyFormData {
  const base = createDefaultPropertyForm();
  if (!property) return base;
  return {
    ...base,
    title: property.title ?? base.title,
    country: property.country ?? base.country,
    city: property.city ?? base.city,
    area: property.area ?? base.area,
    address: property.address ?? base.address,
    exactPrice: property.price ?? base.exactPrice,
    priceRange: property.priceRange ?? base.priceRange,
    priceUnit: property.priceUnit ?? base.priceUnit,
    pricePerUnit: property.pricePerUnit ?? base.pricePerUnit,
    bookingAmount: property.bookingAmount ?? base.bookingAmount,
    maintenanceCharges: property.maintenanceCharges ?? base.maintenanceCharges,
    paymentPlan: property.paymentPlan ?? base.paymentPlan,
    propertyType: property.propertyType ?? base.propertyType,
    listingType: property.listingType ?? base.listingType,
    listingStatus: property.status ?? base.listingStatus,
    bedrooms: property.bedrooms != null ? String(property.bedrooms) : base.bedrooms,
    bathrooms: property.bathrooms != null ? String(property.bathrooms) : base.bathrooms,
    balconies: property.balconies ?? base.balconies,
    areaSize: property.size ?? base.areaSize,
    areaUnit: property.areaUnit ?? base.areaUnit,
    floor: property.floor ?? base.floor,
    totalFloors: property.totalFloors ?? base.totalFloors,
    furnishing: property.furnishing ?? base.furnishing,
    parking: property.parking ?? base.parking,
    facing: property.facing ?? base.facing,
    possessionStatus: property.possessionStatus ?? base.possessionStatus,
    description: property.description ?? base.description,
    coverImageUrl: property.imageUrl ?? base.coverImageUrl,
    galleryImageUrls: joinLines(property.galleryImages),
    ownershipType: property.ownershipType ?? base.ownershipType,
    reraStatus: property.reraStatus ?? base.reraStatus,
    verificationStatus: property.verificationStatus ?? base.verificationStatus,
    visibility: property.visibility ?? base.visibility,
    priority: property.priority ?? base.priority,
    tags: property.tags ?? base.tags,
    amenities: property.amenities ?? base.amenities,
    aiSummary: property.aiSummary ?? base.aiSummary,
    aiInvestmentNote: property.aiInvestmentNote ?? base.aiInvestmentNote,
    rentalYield: property.rentalYield?.toString?.() ?? base.rentalYield,
    appreciationForecast:
      property.appreciationForecast != null ? String(property.appreciationForecast) : base.appreciationForecast,
    investorFit: property.investorFit ?? base.investorFit,
    riskLevel: property.riskLevel ?? base.riskLevel,
    trustScore: property.trustScore ?? base.trustScore,
    roiScore: property.roiScore ?? base.roiScore,
    developerName: property.developerName ?? base.developerName,
    assignedBroker: property.assignedBroker ?? base.assignedBroker,
  };
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="border-white/10 bg-white/5 shadow-[0_0_30px_rgba(0,255,255,0.08)]">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base text-white">{title}</CardTitle>
        <CardDescription className="text-xs text-slate-400">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Label className="text-xs font-medium text-slate-200">
      {label}
      {required ? <span className="ml-1 text-cyan-400">*</span> : null}
    </Label>
  );
}

function FieldHelp({ text }: { text?: string }) {
  return text ? <p className="text-[11px] text-slate-500">{text}</p> : null;
}

function PropertyFieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

function PropertySelect({
  label,
  required,
  value,
  onChange,
  items,
  help,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  items: string[];
  help?: string;
}) {
  return (
    <div className="space-y-2">
      <FieldLabel label={label} required={required} />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="border-white/10 bg-black/40 text-white">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldHelp text={help} />
    </div>
  );
}

export function PropertiesSection() {
  const { properties, leads, toggleFavorite, addAppointment, addProperty, updateProperty } = useDashboard();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<PropertyFormData>(() => createDefaultPropertyForm());
  const [editForm, setEditForm] = useState<PropertyFormData>(() => createDefaultPropertyForm());
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const activeProperty = useMemo(() => properties.find((item) => item.id === activeId) ?? null, [activeId, properties]);
  const activeCountry = addForm.country || editForm.country;
  const currencyCode = getCurrencyByCountry(activeCountry);
  const coverPreview = addForm.coverImageUrl || editForm.coverImageUrl;
  const galleryPreview = splitLines(addForm.galleryImageUrls || editForm.galleryImageUrls);
  const matchedLeads = useMemo(() => {
    if (!activeProperty) return [];
    return leads.filter((lead) => {
      const countryMatch = lead.country === activeProperty.country;
      const typeMatch =
        lead.propertyType.toLowerCase().includes((activeProperty.propertyType || "").toLowerCase()) ||
        (activeProperty.propertyType || "").toLowerCase().includes(lead.propertyType.toLowerCase());
      return countryMatch || typeMatch;
    });
  }, [activeProperty, leads]);

  function resetAddForm() {
    setAddForm(createDefaultPropertyForm());
    setAddErrors({});
  }

  function openEdit(property: Property) {
    setEditForm(toPropertyForm(property));
    setEditErrors({});
    setActiveId(property.id);
    setEditOpen(true);
  }

  function openDetails(property: Property) {
    setShareOpen(false);
    setMatchOpen(false);
    setZoomImage(null);
    setActiveId(property.id);
    void fetchPropertyDetails(property.id);
  }

  async function handleCopyLink(property: Property) {
    const link = getPropertyLink(property);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(link);
    }
    await shareProperty(property.id, "copy");
    toast.success("Property link copied");
  }

  function handleOpenShare(property: Property) {
    setActiveId(property.id);
    setShareOpen(true);
  }

  function handleOpenMatch(property: Property) {
    setActiveId(property.id);
    setMatchOpen(true);
  }

  async function handleBookVisit(property: Property) {
    const appointment = await createPropertyAppointment(property.id);
    addAppointment({
      ...appointment,
      leadName: property.bestBuyerType || "Property Visitor",
      property: property.title,
    });
    toast.success("Site visit booked");
  }

  async function handleToggleFavorite(property: Property) {
    const wasFavorite = Boolean(property.favorite);
    toggleFavorite(property.id);
    await saveFavoriteProperty(property.id);
    toast.success(wasFavorite ? "Removed from favorites" : "Added to favorites");
  }

  async function handleShareChannel(property: Property, channel: "whatsapp" | "email" | "copy" | "linkedin") {
    const link = getPropertyLink(property);
    const summary = [
      property.title,
      getPropertyPriceLabel(property),
      `${property.city}, ${property.country}`,
      link,
    ].join(" • ");

    if (channel === "copy") {
      await handleCopyLink(property);
      return;
    }

    await shareProperty(property.id, channel);

    if (channel === "whatsapp") {
      if (typeof window !== "undefined") {
        window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`, "_blank", "noopener,noreferrer");
      }
      toast.success("WhatsApp share opened");
      return;
    }

    if (channel === "email") {
      if (typeof window !== "undefined") {
        window.location.href = `mailto:?subject=${encodeURIComponent(property.title)}&body=${encodeURIComponent(summary)}`;
      }
      toast.success("Email draft opened");
      return;
    }

    if (channel === "linkedin" && typeof window !== "undefined") {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`, "_blank", "noopener,noreferrer");
    }
    toast.success("Share action started");
  }

  async function handleDownloadPdf() {
    toast.info("PDF export coming soon");
  }

  function submitAdd() {
    const validation = validatePropertyForm(addForm);
    setAddErrors(validation.errors);
    if (!validation.valid) {
      toast.error("Please complete the required property details");
      return;
    }

    const aiSummary = addForm.aiSummary.trim() || generateMockAiSummary(addForm);
    const nextProperty = {
      id: `prop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: addForm.title.trim(),
      country: addForm.country,
      city: addForm.city.trim(),
      area: addForm.area.trim(),
      address: addForm.address.trim(),
      price: addForm.exactPrice || addForm.priceRange,
      currency: currencyCode,
      priceRange: addForm.priceRange,
      priceUnit: addForm.priceUnit,
      pricePerUnit: addForm.pricePerUnit,
      bookingAmount: addForm.bookingAmount,
      maintenanceCharges: addForm.maintenanceCharges,
      paymentPlan: addForm.paymentPlan,
      propertyType: addForm.propertyType,
      listingType: addForm.listingType,
      status: addForm.listingStatus,
      bedrooms: addForm.bedrooms,
      bathrooms: addForm.bathrooms,
      balconies: addForm.balconies,
      size: addForm.areaSize,
      areaUnit: addForm.areaUnit,
      floor: addForm.floor,
      totalFloors: addForm.totalFloors,
      furnishing: addForm.furnishing,
      parking: addForm.parking,
      facing: addForm.facing,
      possessionStatus: addForm.possessionStatus,
      description: addForm.description,
      imageUrl: addForm.coverImageUrl,
      galleryImages: splitLines(addForm.galleryImageUrls),
      ownershipType: addForm.ownershipType,
      reraStatus: addForm.reraStatus,
      verificationStatus: addForm.verificationStatus,
      visibility: addForm.visibility,
      priority: addForm.priority,
      tags: addForm.tags,
      amenities: addForm.amenities,
      aiSummary,
      aiInvestmentNote: addForm.aiInvestmentNote,
      bestBuyerType: addForm.investorFit,
      rentalYield: addForm.rentalYield ? Number(addForm.rentalYield) : undefined,
      appreciationForecast: addForm.appreciationForecast,
      investorFit: addForm.investorFit,
      riskLevel: addForm.riskLevel,
      roiScore: addForm.roiScore,
      trustScore: addForm.trustScore,
      developerName: addForm.developerName,
      assignedBroker: addForm.assignedBroker,
      isFeatured: addForm.isFeatured,
      isHotDeal: addForm.isHotDeal,
      isGlobalProperty: addForm.isGlobalProperty,
      verified: addForm.verificationStatus === "Verified",
      roi: addForm.roiScore,
      image: addForm.coverImageUrl || "🏠",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    addProperty(nextProperty);
    void updatePropertyRecord(nextProperty.id, { createdAt: nextProperty.createdAt, updatedAt: nextProperty.updatedAt });
    toast.success("Property added successfully");
    setAddOpen(false);
    resetAddForm();
  }

  function submitEdit() {
    if (!activeProperty) return;
    const validation = validatePropertyForm(editForm);
    setEditErrors(validation.errors);
    if (!validation.valid) {
      toast.error("Please complete the required property details");
      return;
    }

    const aiSummary = editForm.aiSummary.trim() || generateMockAiSummary(editForm);
    updateProperty(activeProperty.id, {
      title: editForm.title.trim(),
      country: editForm.country,
      city: editForm.city.trim(),
      area: editForm.area.trim(),
      address: editForm.address.trim(),
      price: editForm.exactPrice || editForm.priceRange,
      currency: getCurrencyByCountry(editForm.country),
      priceRange: editForm.priceRange,
      priceUnit: editForm.priceUnit,
      pricePerUnit: editForm.pricePerUnit,
      bookingAmount: editForm.bookingAmount,
      maintenanceCharges: editForm.maintenanceCharges,
      paymentPlan: editForm.paymentPlan,
      propertyType: editForm.propertyType,
      listingType: editForm.listingType,
      status: editForm.listingStatus,
      bedrooms: editForm.bedrooms,
      bathrooms: editForm.bathrooms,
      balconies: editForm.balconies,
      size: editForm.areaSize,
      areaUnit: editForm.areaUnit,
      floor: editForm.floor,
      totalFloors: editForm.totalFloors,
      furnishing: editForm.furnishing,
      parking: editForm.parking,
      facing: editForm.facing,
      possessionStatus: editForm.possessionStatus,
      description: editForm.description,
      imageUrl: editForm.coverImageUrl,
      galleryImages: splitLines(editForm.galleryImageUrls),
      ownershipType: editForm.ownershipType,
      reraStatus: editForm.reraStatus,
      verificationStatus: editForm.verificationStatus,
      visibility: editForm.visibility,
      priority: editForm.priority,
      tags: editForm.tags,
      amenities: editForm.amenities,
      aiSummary,
      aiInvestmentNote: editForm.aiInvestmentNote,
      bestBuyerType: editForm.investorFit,
      rentalYield: editForm.rentalYield ? Number(editForm.rentalYield) : undefined,
      appreciationForecast: editForm.appreciationForecast,
      investorFit: editForm.investorFit,
      riskLevel: editForm.riskLevel,
      roiScore: editForm.roiScore,
      trustScore: editForm.trustScore,
      developerName: editForm.developerName,
      assignedBroker: editForm.assignedBroker,
      isFeatured: editForm.isFeatured,
      isHotDeal: editForm.isHotDeal,
      isGlobalProperty: editForm.isGlobalProperty,
      verified: editForm.verificationStatus === "Verified",
      roi: editForm.roiScore,
      updatedAt: Date.now(),
    });
    void updatePropertyRecord(activeProperty.id, { updatedAt: Date.now() });
    toast.success("Property updated successfully");
    setEditOpen(false);
  }

  const renderForm = (
    form: PropertyFormData,
    setForm: Dispatch<SetStateAction<PropertyFormData>>,
    errors: Record<string, string>,
    submitLabel: string,
    onSubmit: () => void,
    isEdit?: boolean,
  ) => {
    const currentTypeItems = PROPERTY_TYPE_BY_CATEGORY[form.propertyCategory] || PROPERTY_TYPE_BY_CATEGORY.Residential;
    const currentCities = getCitiesByCountry(form.country);
    const currentAreas = getAreasByCity(form.city);
    const currentPriceRanges = getPriceRangesByCountry(form.country);
    const currentCurrencySymbol = getCurrencySymbolByCountry(form.country);
    const exactPricePlaceholder = getExactPricePlaceholderByCountry(form.country);

    return (
      <div className="space-y-6">
        <SectionCard title="Basic Property Details" description="Core listing fields that define the property.">
          <PropertyFieldGrid>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel label="Property Title" required />
              <Input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Luxury 2BHK Apartment in Dubai Marina"
                className="border-white/10 bg-black/40 text-white placeholder:text-slate-500"
              />
              <FieldHelp text="Use a clear marketable title." />
              {errors.title ? <p className="text-xs text-red-400">{errors.title}</p> : null}
            </div>
            <PropertySelect label="Listing Type" required value={form.listingType} onChange={(value) => setForm((prev) => ({ ...prev, listingType: value }))} items={[...LISTING_TYPES]} help="Choose the transaction type." />
            <PropertySelect label="Property Category" required value={form.propertyCategory} onChange={(value) => setForm((prev) => ({ ...prev, propertyCategory: value, propertyType: PROPERTY_TYPE_BY_CATEGORY[value]?.[0] || prev.propertyType }))} items={[...PROPERTY_CATEGORIES]} help="Defines which property type list to show." />
            <PropertySelect label="Property Type" required value={form.propertyType} onChange={(value) => setForm((prev) => ({ ...prev, propertyType: value }))} items={currentTypeItems} help="Pick the precise property subtype." />
            <PropertySelect label="Listing Status" required value={form.listingStatus} onChange={(value) => setForm((prev) => ({ ...prev, listingStatus: value }))} items={[...LISTING_STATUS]} help="Current market availability." />
          </PropertyFieldGrid>
        </SectionCard>

        <SectionCard title="Location Details" description="Country-aware location fields and map coordinates.">
          <PropertyFieldGrid>
            <PropertySelect label="Country" required value={form.country} onChange={(value) => setForm((prev) => ({ ...prev, country: value, city: "", area: "" }))} items={[...PROPERTY_COUNTRIES]} help="Updates currency, pricing and location suggestions." />
            <PropertySelect label="City" required value={form.city} onChange={(value) => setForm((prev) => ({ ...prev, city: value, area: "" }))} items={currentCities} help="Country-based city suggestions." />
            <PropertySelect label="Area / Locality" required value={form.area} onChange={(value) => setForm((prev) => ({ ...prev, area: value }))} items={currentAreas.length ? currentAreas : ["Select city first"]} help="Neighborhood, sector, or district." />
            <div className="space-y-2 md:col-span-2">
              <FieldLabel label="Address" />
              <Textarea
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Tower name, street, landmark, area"
                className="min-h-24 border-white/10 bg-black/40 text-white placeholder:text-slate-500"
              />
              <FieldHelp text="Add any landmark or tower name that helps identify the property." />
            </div>
            <div className="space-y-2">
              <FieldLabel label="Latitude" />
              <Input value={form.latitude} onChange={(e) => setForm((prev) => ({ ...prev, latitude: e.target.value }))} placeholder="25.2048" className="border-white/10 bg-black/40 text-white" />
            </div>
            <div className="space-y-2">
              <FieldLabel label="Longitude" />
              <Input value={form.longitude} onChange={(e) => setForm((prev) => ({ ...prev, longitude: e.target.value }))} placeholder="55.2708" className="border-white/10 bg-black/40 text-white" />
            </div>
            <div className="md:col-span-3">
              <Button
                type="button"
                variant="secondary"
                className="border-white/10 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
                onClick={() => toast.info("Pick on Map will be connected later")}
              >
                Pick on Map
              </Button>
            </div>
          </PropertyFieldGrid>
        </SectionCard>

        <SectionCard title="Pricing & Currency" description={`Auto currency: ${currentCurrencySymbol} (${getCurrencyByCountry(form.country)})`}>
          <PropertyFieldGrid>
            <PropertySelect label="Price Range" value={form.priceRange} onChange={(value) => setForm((prev) => ({ ...prev, priceRange: value }))} items={currentPriceRanges} help="Country-specific price band suggestions." />
            <div className="space-y-2">
              <FieldLabel label="Exact Price" />
              <Input
                value={form.exactPrice}
                onChange={(e) => setForm((prev) => ({ ...prev, exactPrice: e.target.value }))}
                placeholder={exactPricePlaceholder}
                className="border-white/10 bg-black/40 text-white placeholder:text-slate-500"
              />
              <FieldHelp text={`Formatted in ${getCurrencyByCountry(form.country)}.`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <FieldLabel label="Price Per Unit" />
                <Input value={form.pricePerUnit} onChange={(e) => setForm((prev) => ({ ...prev, pricePerUnit: e.target.value }))} placeholder="1200" className="border-white/10 bg-black/40 text-white" />
              </div>
              <PropertySelect label="Unit" value={form.priceUnit} onChange={(value) => setForm((prev) => ({ ...prev, priceUnit: value }))} items={[...UNIT_OPTIONS]} />
            </div>
            <div className="space-y-2">
              <FieldLabel label="Maintenance Charges" />
              <Input value={form.maintenanceCharges} onChange={(e) => setForm((prev) => ({ ...prev, maintenanceCharges: e.target.value }))} placeholder={`${currentCurrencySymbol} 0`} className="border-white/10 bg-black/40 text-white" />
            </div>
            <div className="space-y-2">
              <FieldLabel label="Booking Amount" />
              <Input value={form.bookingAmount} onChange={(e) => setForm((prev) => ({ ...prev, bookingAmount: e.target.value }))} placeholder={`${currentCurrencySymbol} 0`} className="border-white/10 bg-black/40 text-white" />
            </div>
            <PropertySelect label="Payment Plan" value={form.paymentPlan} onChange={(value) => setForm((prev) => ({ ...prev, paymentPlan: value }))} items={[...PAYMENT_PLAN_OPTIONS]} help="Choose how the buyer will pay." />
          </PropertyFieldGrid>
        </SectionCard>

        <SectionCard title="Property Specifications" description="All physical details that buyers filter on.">
          <PropertyFieldGrid>
            <PropertySelect label="Bedrooms" value={form.bedrooms} onChange={(value) => setForm((prev) => ({ ...prev, bedrooms: value }))} items={[...BEDROOM_OPTIONS]} />
            <PropertySelect label="Bathrooms" value={form.bathrooms} onChange={(value) => setForm((prev) => ({ ...prev, bathrooms: value }))} items={[...BATHROOM_OPTIONS]} />
            <PropertySelect label="Balconies" value={form.balconies} onChange={(value) => setForm((prev) => ({ ...prev, balconies: value }))} items={[...BALCONY_OPTIONS]} />
            <div className="space-y-2">
              <FieldLabel label="Area Size" />
              <Input value={form.areaSize} onChange={(e) => setForm((prev) => ({ ...prev, areaSize: e.target.value }))} placeholder="1450" className="border-white/10 bg-black/40 text-white" />
            </div>
            <PropertySelect label="Area Unit" value={form.areaUnit} onChange={(value) => setForm((prev) => ({ ...prev, areaUnit: value }))} items={[...AREA_UNIT_OPTIONS]} />
            <PropertySelect label="Furnishing" value={form.furnishing} onChange={(value) => setForm((prev) => ({ ...prev, furnishing: value }))} items={[...FURNISHING_OPTIONS]} />
            <PropertySelect label="Floor" value={form.floor} onChange={(value) => setForm((prev) => ({ ...prev, floor: value }))} items={[...FLOOR_OPTIONS]} />
            <div className="space-y-2">
              <FieldLabel label="Total Floors" />
              <Input value={form.totalFloors} onChange={(e) => setForm((prev) => ({ ...prev, totalFloors: e.target.value }))} placeholder="20" className="border-white/10 bg-black/40 text-white" />
            </div>
            <PropertySelect label="Parking" value={form.parking} onChange={(value) => setForm((prev) => ({ ...prev, parking: value }))} items={[...PARKING_OPTIONS]} />
            <PropertySelect label="Facing" value={form.facing} onChange={(value) => setForm((prev) => ({ ...prev, facing: value }))} items={[...FACING_OPTIONS]} />
            <PropertySelect label="Possession Status" value={form.possessionStatus} onChange={(value) => setForm((prev) => ({ ...prev, possessionStatus: value }))} items={[...POSSESSION_OPTIONS]} />
          </PropertyFieldGrid>
        </SectionCard>

        <SectionCard title="Investment Metrics" description="Scoring and investor fit signals.">
          <PropertyFieldGrid>
            <div className="space-y-2">
              <FieldLabel label="Rental Yield" />
              <Input value={form.rentalYield} onChange={(e) => setForm((prev) => ({ ...prev, rentalYield: e.target.value }))} placeholder="6.2" className="border-white/10 bg-black/40 text-white" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel label="ROI Score" />
              <Slider value={[form.roiScore]} max={100} step={1} onValueChange={([value]) => setForm((prev) => ({ ...prev, roiScore: value }))} />
              <div className="text-xs text-slate-400">Score: {form.roiScore}/100</div>
            </div>
            <PropertySelect label="Appreciation Forecast" value={form.appreciationForecast} onChange={(value) => setForm((prev) => ({ ...prev, appreciationForecast: value }))} items={[...APPRECIATION_OPTIONS]} />
            <PropertySelect label="Investor Fit" value={form.investorFit} onChange={(value) => setForm((prev) => ({ ...prev, investorFit: value }))} items={[...INVESTOR_FIT_OPTIONS]} />
            <PropertySelect label="Risk Level" value={form.riskLevel} onChange={(value) => setForm((prev) => ({ ...prev, riskLevel: value }))} items={[...RISK_OPTIONS]} />
            <div className="space-y-2 md:col-span-3">
              <FieldLabel label="AI Investment Note" />
              <Textarea
                value={form.aiInvestmentNote}
                onChange={(e) => setForm((prev) => ({ ...prev, aiInvestmentNote: e.target.value }))}
                placeholder="AI insight about why this property is attractive or risky"
                className="min-h-24 border-white/10 bg-black/40 text-white placeholder:text-slate-500"
              />
            </div>
          </PropertyFieldGrid>
        </SectionCard>

        <SectionCard title="Media & Images" description="Property visuals with upload-ready structure.">
          <PropertyFieldGrid>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel label="Cover Image URL" />
              <Input
                value={form.coverImageUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, coverImageUrl: e.target.value }))}
                placeholder="https://example.com/property-cover.jpg"
                className="border-white/10 bg-black/40 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel label="Upload Image" />
              <Button type="button" className="w-full bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30" onClick={() => toast.info("Mock upload UI ready for Supabase Storage / Cloudflare R2")}>
                Upload Image
              </Button>
            </div>
            <div className="space-y-2 md:col-span-3">
              <FieldLabel label="Gallery Image URLs" />
              <Textarea
                value={form.galleryImageUrls}
                onChange={(e) => setForm((prev) => ({ ...prev, galleryImageUrls: e.target.value }))}
                placeholder="One URL per line"
                className="min-h-24 border-white/10 bg-black/40 text-white placeholder:text-slate-500"
              />
              <FieldHelp text="Paste one image URL per line." />
            </div>
            <div className="grid gap-3 md:col-span-3 md:grid-cols-4">
              {coverPreview ? (
                <img src={coverPreview} alt="Cover preview" className="h-28 w-full rounded-xl object-cover" />
              ) : (
                <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/5 text-xs text-slate-500">Cover preview</div>
              )}
              {galleryPreview.slice(0, 3).map((url) => (
                <img key={url} src={url} alt="Gallery preview" className="h-28 w-full rounded-xl object-cover" />
              ))}
            </div>
          </PropertyFieldGrid>
        </SectionCard>

        <SectionCard title="Ownership / Verification" description="Legal and trust-related details.">
          <PropertyFieldGrid>
            <PropertySelect label="Ownership Type" value={form.ownershipType} onChange={(value) => setForm((prev) => ({ ...prev, ownershipType: value }))} items={[...OWNERSHIP_TYPES]} />
            <PropertySelect label="RERA / Regulatory Status" value={form.reraStatus} onChange={(value) => setForm((prev) => ({ ...prev, reraStatus: value }))} items={[...RERA_STATUS]} />
            <div className="space-y-2">
              <FieldLabel label="Developer / Builder Name" />
              <Input value={form.developerName} onChange={(e) => setForm((prev) => ({ ...prev, developerName: e.target.value }))} placeholder="Builder / developer name" className="border-white/10 bg-black/40 text-white" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel label="Trust Score" />
              <Slider value={[form.trustScore]} max={100} step={1} onValueChange={([value]) => setForm((prev) => ({ ...prev, trustScore: value }))} />
              <div className="text-xs text-slate-400">Trust score: {form.trustScore}/100</div>
            </div>
            <PropertySelect label="Verification Status" value={form.verificationStatus} onChange={(value) => setForm((prev) => ({ ...prev, verificationStatus: value }))} items={[...VERIFICATION_STATUS]} />
          </PropertyFieldGrid>
        </SectionCard>

        <SectionCard title="Listing Settings" description="Visibility, priority, tags and broker assignment.">
          <PropertyFieldGrid>
            <PropertySelect label="Visibility" value={form.visibility} onChange={(value) => setForm((prev) => ({ ...prev, visibility: value }))} items={[...VISIBILITY_OPTIONS]} />
            <PropertySelect label="Priority" value={form.priority} onChange={(value) => setForm((prev) => ({ ...prev, priority: value }))} items={[...PRIORITY_OPTIONS]} />
            <div className="space-y-2 md:col-span-3">
              <FieldLabel label="Tags" />
              <div className="flex flex-wrap gap-2">
                {TAG_OPTIONS.map((tag) => (
                  <Button
                    key={tag}
                    type="button"
                    variant={form.tags.includes(tag) ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        tags: prev.tags.includes(tag) ? prev.tags.filter((item) => item !== tag) : [...prev.tags, tag],
                      }))
                    }
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </div>
            <PropertySelect label="Assign Broker" value={form.assignedBroker} onChange={(value) => setForm((prev) => ({ ...prev, assignedBroker: value }))} items={BROKERS} />
            <div className="space-y-2">
              <FieldLabel label="Listing Flags" />
              <div className="flex gap-3 text-xs text-slate-300">
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((prev) => ({ ...prev, isFeatured: e.target.checked }))} /> Featured</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.isHotDeal} onChange={(e) => setForm((prev) => ({ ...prev, isHotDeal: e.target.checked }))} /> Hot Deal</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.isGlobalProperty} onChange={(e) => setForm((prev) => ({ ...prev, isGlobalProperty: e.target.checked }))} /> Global Property</label>
              </div>
            </div>
          </PropertyFieldGrid>
        </SectionCard>

        <SectionCard title="Description & AI Notes" description="Human description plus generated summary.">
          <PropertyFieldGrid>
            <div className="space-y-2 md:col-span-3">
              <FieldLabel label="Description" />
              <Textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe property highlights, location benefits, amenities, investment value"
                className="min-h-32 border-white/10 bg-black/40 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2 md:col-span-3">
              <FieldLabel label="Amenities" />
              <div className="flex flex-wrap gap-2">
                {AMENITY_OPTIONS.map((amenity) => (
                  <Button
                    key={amenity}
                    type="button"
                    size="sm"
                    variant={form.amenities.includes(amenity) ? "default" : "outline"}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        amenities: prev.amenities.includes(amenity) ? prev.amenities.filter((item) => item !== amenity) : [...prev.amenities, amenity],
                      }))
                    }
                  >
                    {amenity}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2 md:col-span-3">
              <FieldLabel label="AI Summary" />
              <Textarea
                value={form.aiSummary}
                onChange={(e) => setForm((prev) => ({ ...prev, aiSummary: e.target.value }))}
                placeholder="AI-generated summary will appear here"
                className="min-h-28 border-white/10 bg-black/40 text-white placeholder:text-slate-500"
              />
              <Button type="button" className="bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30" onClick={() => setForm((prev) => ({ ...prev, aiSummary: generateMockAiSummary(prev) }))}>
                Auto-generate AI Summary
              </Button>
            </div>
          </PropertyFieldGrid>
        </SectionCard>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => (isEdit ? setEditOpen(false) : setAddOpen(false))}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} className="bg-cyan-500 text-black hover:bg-cyan-400">
            {submitLabel}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Properties</h2>
          <p className="text-sm text-slate-400">Professional global listing management with fast add/edit flows.</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setAddOpen(true)}>Add Property</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-slate-950 text-white sm:max-w-6xl">
            <DialogHeader>
              <DialogTitle>Add Property</DialogTitle>
              <DialogDescription className="text-slate-400">Create a premium property listing with country-aware pricing and guided fields.</DialogDescription>
            </DialogHeader>
            {renderForm(addForm, setAddForm, addErrors, "Save Property", submitAdd)}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {properties.map((property) => (
          <Card key={property.id} className="border-white/10 bg-white/5">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-white">{property.title}</CardTitle>
                  <CardDescription className="text-xs text-slate-400">{property.city}, {property.country}</CardDescription>
                </div>
                <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-100">{property.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="aspect-[16/10] overflow-hidden rounded-xl bg-white/5">
                <img src={property.imageUrl || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80"} alt={property.title} className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">{property.listingType}</Badge>
                <Badge variant="outline">{property.propertyType}</Badge>
                {property.verified ? <Badge className="bg-emerald-500/20 text-emerald-100">Verified</Badge> : null}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Price</span>
                <span className="font-medium text-white">{property.currency || currencyCode} {property.price || property.priceRange || "On request"}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(property)}>Edit</Button>
                <Button size="sm" className="flex-1" onClick={() => openDetails(property)}>View Details</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        open={Boolean(activeProperty)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveId(null);
            setShareOpen(false);
            setMatchOpen(false);
            setZoomImage(null);
          }
        }}
      >
        <DialogContent className="max-h-[96vh] w-[calc(100vw-1rem)] overflow-y-auto border-white/10 bg-slate-950 text-white sm:max-w-6xl">
          <DialogHeader className="space-y-2 pr-10">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-cyan-500/40 bg-cyan-500/10 text-cyan-100">
                {activeProperty?.listingType || "Listing"}
              </Badge>
              <Badge variant="outline" className="border-white/15 text-slate-200">
                {activeProperty?.status || "Available"}
              </Badge>
              {activeProperty?.verified ? <Badge className="bg-emerald-500/20 text-emerald-100">Verified</Badge> : null}
            </div>
            <DialogTitle className="text-2xl text-white">{activeProperty?.title}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {activeProperty?.city}, {activeProperty?.country}
            </DialogDescription>
          </DialogHeader>
          {activeProperty ? (
            <div className="space-y-6">
              {(() => {
                const coverImage = activeProperty.imageUrl || FALLBACK_PROPERTY_IMAGE;
                const galleryImages = [coverImage, ...(activeProperty.galleryImages || [])].filter(Boolean).slice(0, 6);
                const nearbyPlaces = getPropertyNearbyPlaces(activeProperty);
                const locationAdvantages = getPropertyLocationAdvantages(activeProperty);
                const priceLabel = getPropertyPriceLabel(activeProperty);
                const pricePerUnitLabel = formatPriceWithUnit(activeProperty.pricePerUnit, activeProperty.priceUnit || activeProperty.areaUnit);
                return (
                  <>
                    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                        <div className="relative">
                          <img
                            src={coverImage}
                            alt={activeProperty.title}
                            className="h-[22rem] w-full object-cover sm:h-[26rem]"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-3 p-4">
                            <div className="space-y-1">
                              <div className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">Property Preview</div>
                              <div className="text-lg font-semibold text-white">{priceLabel}</div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="bg-black/60 text-white hover:bg-black/80"
                              onClick={() => setZoomImage(coverImage)}
                            >
                              <Maximize2 className="mr-2 h-4 w-4" />
                              Zoom
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-6">
                          {galleryImages.map((url, index) => (
                            <button
                              key={`${url}-${index}`}
                              type="button"
                              className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5"
                              onClick={() => setZoomImage(url)}
                            >
                              <img
                                src={url}
                                alt={`${activeProperty.title} gallery ${index + 1}`}
                                className="h-20 w-full object-cover transition duration-300 group-hover:scale-105"
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Card className="border-white/10 bg-white/5">
                          <CardContent className="space-y-3 p-4">
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <Badge variant="outline" className="border-white/15 text-slate-200">
                                {activeProperty.propertyType || "Property"}
                              </Badge>
                              <Badge variant="outline" className="border-cyan-500/40 bg-cyan-500/10 text-cyan-100">
                                {activeProperty.listingType || "Sale"}
                              </Badge>
                              {activeProperty.bestBuyerType ? (
                                <Badge className="bg-violet-500/15 text-violet-100">{activeProperty.bestBuyerType}</Badge>
                              ) : null}
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Price</div>
                              <div className="text-3xl font-semibold text-white">{priceLabel}</div>
                              <div className="text-sm text-slate-400">
                                {activeProperty.address || "Address not specified"}
                              </div>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                                <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Location</div>
                                <div className="mt-1 text-sm text-white">
                                  {activeProperty.country}, {activeProperty.city}
                                </div>
                                <div className="text-xs text-slate-400">{activeProperty.area || "Area not specified"}</div>
                              </div>
                              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                                <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Trust / Risk</div>
                                <div className="mt-1 text-sm text-white">
                                  {activeProperty.trustScore ?? 0}/100 trust
                                </div>
                                <div className="text-xs text-slate-400">{activeProperty.riskLevel || "Medium"} risk</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-white/10 bg-white/5">
                          <CardContent className="space-y-3 p-4">
                            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Quick Actions</div>
                            <div className="flex flex-wrap gap-2">
                              <Button type="button" onClick={() => handleOpenShare(activeProperty)}>
                                <Share2 className="mr-2 h-4 w-4" />
                                Share Property
                              </Button>
                              <Button type="button" variant="outline" onClick={() => handleShareChannel(activeProperty, "whatsapp")}>
                                WhatsApp
                              </Button>
                              <Button type="button" variant="outline" onClick={() => handleShareChannel(activeProperty, "email")}>
                                Email
                              </Button>
                              <Button type="button" variant="outline" onClick={() => handleCopyLink(activeProperty)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Link
                              </Button>
                              <Button type="button" variant="outline" onClick={() => handleOpenMatch(activeProperty)}>
                                <Users className="mr-2 h-4 w-4" />
                                Match Leads
                              </Button>
                              <Button type="button" variant="outline" onClick={() => handleBookVisit(activeProperty)}>
                                <CalendarCheck2 className="mr-2 h-4 w-4" />
                                Book Visit
                              </Button>
                              <Button type="button" variant="outline" onClick={() => handleToggleFavorite(activeProperty)}>
                                <Heart className="mr-2 h-4 w-4" />
                                {activeProperty.favorite ? "Remove Favorite" : "Add to Favorite"}
                              </Button>
                              <Button type="button" variant="outline" onClick={handleDownloadPdf}>
                                <Download className="mr-2 h-4 w-4" />
                                Download PDF
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <Card className="border-white/10 bg-white/5">
                        <CardHeader>
                          <CardTitle className="text-lg text-white">Property Specs</CardTitle>
                          <CardDescription className="text-slate-400">Buyer-facing layout and living details.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 sm:grid-cols-2">
                          {[
                            ["Bedrooms", activeProperty.bedrooms ?? "Not specified"],
                            ["Bathrooms", activeProperty.bathrooms ?? "Not specified"],
                            ["Balconies", activeProperty.balconies ?? "Not specified"],
                            ["Area Size", activeProperty.size || "Not specified"],
                            ["Floor", activeProperty.floor || "Not specified"],
                            ["Total Floors", activeProperty.totalFloors || "Not specified"],
                            ["Furnishing", activeProperty.furnishing || "Not specified"],
                            ["Parking", activeProperty.parking || "Not specified"],
                            ["Facing", activeProperty.facing || "Not specified"],
                            ["Possession", activeProperty.possessionStatus || "Not specified"],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                              <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">{label}</div>
                              <div className="mt-1 text-sm text-white">{String(value)}</div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      <Card className="border-white/10 bg-white/5">
                        <CardHeader>
                          <CardTitle className="text-lg text-white">Financial Details</CardTitle>
                          <CardDescription className="text-slate-400">Investment and payment inputs buyers check first.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 sm:grid-cols-2">
                          {[
                            ["Exact Price", activeProperty.price || "On request"],
                            ["Price Range", activeProperty.priceRange || "Not specified"],
                            ["Price / Unit", pricePerUnitLabel],
                            ["Booking Amount", activeProperty.bookingAmount || "Not specified"],
                            ["Maintenance", activeProperty.maintenanceCharges || "Not specified"],
                            ["Payment Plan", activeProperty.paymentPlan || "Not specified"],
                            ["Rental Yield", activeProperty.rentalYield != null ? `${activeProperty.rentalYield}%` : "Not specified"],
                            ["ROI Score", `${activeProperty.roiScore ?? activeProperty.roi ?? 0}/100`],
                            ["Appreciation", activeProperty.appreciationForecast != null ? `${activeProperty.appreciationForecast}%` : "Not specified"],
                            ["Listing Status", activeProperty.status || "Available"],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                              <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">{label}</div>
                              <div className="mt-1 text-sm text-white">{String(value)}</div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <Card className="border-white/10 bg-white/5">
                        <CardHeader>
                          <CardTitle className="text-lg text-white">Client Decision Info</CardTitle>
                          <CardDescription className="text-slate-400">Location, legal, and ownership signals.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex flex-wrap gap-2">
                            {activeProperty.amenities?.length
                              ? activeProperty.amenities.map((amenity) => (
                                  <Badge key={amenity} variant="outline" className="border-white/15 text-slate-200">
                                    {amenity}
                                  </Badge>
                                ))
                              : (
                                <Badge variant="outline" className="border-white/15 text-slate-400">
                                  No amenities added
                                </Badge>
                              )}
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                              <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Nearby Places</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {nearbyPlaces.map((item) => (
                                  <Badge key={item} variant="secondary" className="bg-white/5 text-slate-100">
                                    {item}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                              <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Location Advantages</div>
                              <ul className="mt-2 space-y-1 text-sm text-slate-200">
                                {locationAdvantages.map((item) => (
                                  <li key={item}>• {item}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                              <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Builder / Developer</div>
                              <div className="mt-1 text-sm text-white">{activeProperty.developerName || "Not specified"}</div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                              <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Ownership / RERA</div>
                              <div className="mt-1 text-sm text-white">{activeProperty.ownershipType || "Not specified"}</div>
                              <div className="text-xs text-slate-400">{activeProperty.reraStatus || activeProperty.verificationStatus || "Pending"}</div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                              <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Trust Score</div>
                              <div className="mt-1 text-sm text-white">{activeProperty.trustScore ?? 0}/100</div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                              <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Risk Level</div>
                              <div className="mt-1 text-sm text-white">{activeProperty.riskLevel || "Medium"}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-white/10 bg-white/5">
                        <CardHeader>
                          <CardTitle className="text-lg text-white">AI Insight</CardTitle>
                          <CardDescription className="text-slate-400">Investor-facing summary and decision guidance.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                            <div className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">AI Investment Summary</div>
                            <p className="mt-2 text-sm leading-6 text-slate-100">
                              {activeProperty.aiSummary ||
                                activeProperty.description ||
                                "This property is presented as an investment-ready listing with premium location visibility and a clean buyer story."}
                            </p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                              <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Best Buyer Type</div>
                              <div className="mt-1 text-sm text-white">{getPropertyBestBuyerType(activeProperty)}</div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                              <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Why Suitable</div>
                              <div className="mt-1 text-sm text-white">
                                {activeProperty.rentalYield != null
                                  ? `Strong yield profile at ${activeProperty.rentalYield}%`
                                  : "Aligned with buyer/investor demand in this segment"}
                              </div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                              <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Risk Warning</div>
                              <div className="mt-1 text-sm text-white">
                                {activeProperty.riskLevel || "Moderate"} risk: verify docs, pricing, and local compliance before closure.
                              </div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                              <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Suggested Action</div>
                              <div className="mt-1 text-sm text-white">
                                Share the property, book a visit, and match it to qualified leads.
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => activeProperty && openEdit(activeProperty)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Property
                      </Button>
                      <Button type="button" variant="outline" onClick={() => handleOpenMatch(activeProperty)}>
                        <Users className="mr-2 h-4 w-4" />
                        Match Leads ({matchedLeads.length})
                      </Button>
                      <Button type="button" onClick={() => handleOpenShare(activeProperty)}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share Property
                      </Button>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen && Boolean(activeProperty)} onOpenChange={setShareOpen}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] overflow-y-auto border-white/10 bg-slate-950 text-white sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Share Property</DialogTitle>
            <DialogDescription className="text-slate-400">Share this property through the channels buyers and investors actually use.</DialogDescription>
          </DialogHeader>
          {activeProperty ? (
            <div className="space-y-4">
              <Card className="border-white/10 bg-white/5">
                <CardContent className="space-y-2 p-4">
                  <div className="text-lg font-semibold text-white">{activeProperty.title}</div>
                  <div className="text-sm text-slate-400">{getPropertyPriceLabel(activeProperty)}</div>
                  <div className="text-xs text-slate-500">{getPropertyLink(activeProperty)}</div>
                </CardContent>
              </Card>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button type="button" variant="outline" onClick={() => handleShareChannel(activeProperty, "whatsapp")}>
                  WhatsApp
                </Button>
                <Button type="button" variant="outline" onClick={() => handleShareChannel(activeProperty, "email")}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </Button>
                <Button type="button" variant="outline" onClick={() => handleCopyLink(activeProperty)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Link
                </Button>
                <Button type="button" variant="outline" onClick={() => handleShareChannel(activeProperty, "linkedin")}>
                  LinkedIn
                </Button>
              </div>
              <div className="flex justify-end">
                <Button type="button" onClick={handleDownloadPdf}>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={matchOpen && Boolean(activeProperty)} onOpenChange={setMatchOpen}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] overflow-y-auto border-white/10 bg-slate-950 text-white sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Matched Leads</DialogTitle>
            <DialogDescription className="text-slate-400">Qualified leads that fit this property profile.</DialogDescription>
          </DialogHeader>
          {activeProperty ? (
            <div className="space-y-3">
              <Card className="border-white/10 bg-white/5">
                <CardContent className="p-4">
                  <div className="text-sm text-slate-300">
                    {matchedLeads.length} leads matched for {activeProperty.title}
                  </div>
                </CardContent>
              </Card>
              <div className="grid gap-3">
                {matchedLeads.slice(0, 6).map((lead) => (
                  <Card key={lead.id} className="border-white/10 bg-white/5">
                    <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-medium text-white">{lead.name}</div>
                        <div className="text-xs text-slate-400">
                          {lead.country} • {lead.city} • {lead.buyerType}
                        </div>
                      </div>
                      <Badge variant="outline" className="border-cyan-500/30 text-cyan-100">
                        AI {lead.aiScore}/100
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
                {matchedLeads.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                    No matched leads found yet.
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(zoomImage)} onOpenChange={(open) => !open && setZoomImage(null)}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] overflow-y-auto border-white/10 bg-slate-950 text-white sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {zoomImage ? <img src={zoomImage} alt="Property preview" className="h-auto w-full rounded-2xl object-cover" /> : null}
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-slate-950 text-white sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
            <DialogDescription className="text-slate-400">Update listing details without losing the existing data.</DialogDescription>
          </DialogHeader>
          {renderForm(editForm, setEditForm, editErrors, "Save Changes", submitEdit, true)}
        </DialogContent>
      </Dialog>
    </div>
  );
}

