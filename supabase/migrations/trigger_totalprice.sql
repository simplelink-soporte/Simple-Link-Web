CREATE OR REPLACE FUNCTION public.calculate_total_price()
RETURNS TRIGGER AS $$
BEGIN
  -- Usar los precios proporcionados directamente
  NEW.total_price = COALESCE(NEW.court_price, 0) + COALESCE(NEW.rental_items_price, 0);
  
  -- Log para debugging
  RAISE NOTICE 'Calculando precio total: court_price=%, rental_items_price=%, total=%', 
    NEW.court_price, NEW.rental_items_price, NEW.total_price;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER calculate_total_price_trigger
BEFORE INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION public.calculate_total_price(); 