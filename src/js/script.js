/* global Handlebars, utils, dataSource */ // eslint-disable-line no-unused-vars

{
  ('use strict');

  const select = {
    templateOf: {
      menuProduct: '#template-menu-product',
      cartProduct: '#template-cart-product', // CODE ADDED
    },
    containerOf: {
      menu: '#product-list',
      cart: '#cart',
    },
    all: {
      menuProducts: '#product-list > .product',
      menuProductsActive: '#product-list > .product.active',
      formInputs: 'input, select',
    },
    menuProduct: {
      clickable: '.product__header',
      form: '.product__order',
      priceElem: '.product__total-price .price',
      imageWrapper: '.product__images',
      amountWidget: '.widget-amount',
      cartButton: '[href="#add-to-cart"]',
    },
    widgets: {
      amount: {
        input: 'input.amount', // CODE CHANGED
        linkDecrease: 'a[href="#less"]',
        linkIncrease: 'a[href="#more"]',
      },
    },
    // CODE ADDED START
    cart: {
      productList: '.cart__order-summary',
      toggleTrigger: '.cart__summary',
      totalNumber: `.cart__total-number`,
      totalPrice:
        '.cart__total-price strong, .cart__order-total .cart__order-price-sum strong',
      subtotalPrice: '.cart__order-subtotal .cart__order-price-sum strong',
      deliveryFee: '.cart__order-delivery .cart__order-price-sum strong',
      form: '.cart__order',
      formSubmit: '.cart__order [type="submit"]',
      phone: '[name="phone"]',
      address: '[name="address"]',
    },
    cartProduct: {
      amountWidget: '.widget-amount',
      price: '.cart__product-price',
      edit: '[href="#edit"]',
      remove: '[href="#remove"]',
    },
    // CODE ADDED END
  };

  const classNames = {
    menuProduct: {
      wrapperActive: 'active',
      imageVisible: 'active',
    },
    // CODE ADDED START
    cart: {
      wrapperActive: 'active',
    },
    // CODE ADDED END
  };

  const settings = {
    amountWidget: {
      defaultValue: 1,
      defaultMin: 1,
      defaultMax: 9,
    },
    cart: {
      defaultDeliveryFee: 20,
    },

    db: {
      url: '//localhost:3131',
      products: 'products',
      orders: 'orders',
    },
  };

  const templates = {
    menuProduct: Handlebars.compile(
      document.querySelector(select.templateOf.menuProduct).innerHTML
    ),
    // CODE ADDED START
    cartProduct: Handlebars.compile(
      document.querySelector(select.templateOf.cartProduct).innerHTML
    ),
    // CODE ADDED END
  };

  class Product {
    constructor(id, data) {
      const thisProduct = this;

      thisProduct.id = id;
      thisProduct.data = data;

      thisProduct.renderInMenu();
      thisProduct.getElements();
      thisProduct.initAccordion();
      thisProduct.initOrderForm();
      thisProduct.initAmountWidget();
      thisProduct.processOrder();

      ////console.log('new Product:', thisProduct);
    }

    renderInMenu() {
      const thisProduct = this;

      // generate HTML based on template
      const generatedHTML = templates.menuProduct(thisProduct.data);
      //create element using utils.createElementFromHTML
      thisProduct.element = utils.createDOMFromHTML(generatedHTML);
      //find menu container
      const menuContainer = document.querySelector(select.containerOf.menu);
      //add element to menu
      menuContainer.appendChild(thisProduct.element);
    }

    getElements() {
      const thisProduct = this;

      thisProduct.dom = {};

      thisProduct.dom.accordionTrigger = thisProduct.element.querySelector(
        select.menuProduct.clickable
      );
      thisProduct.dom.form = thisProduct.element.querySelector(
        select.menuProduct.form
      );
      ////console.log('thisProduct.dom.form', thisProduct.dom.form);
      thisProduct.dom.formInputs = thisProduct.dom.form.querySelectorAll(
        select.all.formInputs
      );
      ////console.log('thisProduct.dom.formInputs', thisProduct.dom.formInputs);
      thisProduct.dom.cartButton = thisProduct.element.querySelector(
        select.menuProduct.cartButton
      );
      thisProduct.dom.priceElem = thisProduct.element.querySelector(
        select.menuProduct.priceElem
      );

      thisProduct.dom.imageWrapper = thisProduct.element.querySelector(
        select.menuProduct.imageWrapper
      );

      thisProduct.dom.amountWidgetElem = thisProduct.element.querySelector(
        select.menuProduct.amountWidget
      );
    }

    initAccordion() {
      const thisProduct = this;
      /* find the clickable trigger (the element that should react to clicking) */

      /* START: add event listener to clickable trigger on event click */
      thisProduct.dom.accordionTrigger.addEventListener(
        'click',
        function (event) {
          /* prevent default action for event */
          event.preventDefault();
          /* find active product (product that has active class) */
          const activeProduct = document.querySelector(
            select.all.menuProductsActive
          );
          ////console.log('activeProduct', activeProduct);
          /* if there is active product and it's not thisProduct.element, remove class active from it */
          if (activeProduct && activeProduct != thisProduct.element) {
            activeProduct.classList.remove(
              classNames.menuProduct.wrapperActive
            );
          }
          /* toggle active class on thisProduct.element */
          thisProduct.element.classList.toggle(
            classNames.menuProduct.wrapperActive
          );
        }
      );
    }

    initOrderForm() {
      const thisProduct = this;
      ////console.log('initOrderForm');

      // thisProduct.dom.form.addEventListener('submit', function (event) {
      //   event.preventDefault();
      //   thisProduct.processOrder();
      //   ////console.log('Form Event Lintener added');
      // });

      for (let input of thisProduct.dom.formInputs) {
        input.addEventListener('change', function () {
          thisProduct.processOrder();
          ////console.log('Process after change in form');
        });
      }

      thisProduct.dom.cartButton.addEventListener('click', function (event) {
        event.preventDefault();
        thisProduct.processOrder();
        ////console.log('Process after click');
        thisProduct.addToCart();
      });
    }

    initAmountWidget() {
      const thisProduct = this;

      thisProduct.amountWidget = new AmountWidget(
        thisProduct.dom.amountWidgetElem
      );
      thisProduct.dom.amountWidgetElem.addEventListener('updated', function () {
        thisProduct.processOrder();
      });
    }

    processOrder() {
      const thisProduct = this;
      //console.log('processOrder');
      //What options has been choosen?
      const formData = utils.serializeFormToObject(thisProduct.dom.form);
      //console.log('formData', formData);

      // Default price of the product with default options
      let price = thisProduct.data.price;

      // for every category (param)...
      for (let paramId in thisProduct.data.params) {
        // determine param value, e.g. paramId = 'toppings', param = { label: 'Toppings', type: 'checkboxes'... }
        const param = thisProduct.data.params[paramId];
        //console.log(paramId, param);

        // for every option in this category
        for (let optionId in param.options) {
          // determine option value, e.g. optionId = 'olives', option = { label: 'Olives', price: 2, default: true }
          const option = param.options[optionId];
          //console.log(optionId, option);
          let optionSelected =
            formData[paramId] && formData[paramId].includes(optionId);
          // check if there is param with a name of paramId in formData and if it includes optionId
          let optionImg = thisProduct.dom.imageWrapper.querySelector(
            '.' + paramId + '-' + optionId
          );

          if (optionImg) {
            if (optionSelected)
              optionImg.classList.add(classNames.menuProduct.imageVisible);
            else {
              optionImg.classList.remove(classNames.menuProduct.imageVisible);
            }
          }
          if (optionSelected && !option.default) {
            price += option.price;
          }

          if (!optionSelected && option.default) {
            price -= option.price;
          }
        }
      } // multiply price by amount
      thisProduct.priceSingle = price;
      price *= thisProduct.amountWidget.value;

      //Save price for Cart

      // update calculated price in the HTML
      thisProduct.dom.priceElem.innerHTML = price;
    }

    addToCart() {
      const thisProduct = this;

      app.cart.add(thisProduct.prepareCartProduct());
    }

    prepareCartProduct() {
      const thisProduct = this;
      const productSummary = {
        id: thisProduct.id,
        name: thisProduct.data.name,
        amount: thisProduct.amountWidget.value,
        priceSingle: thisProduct.priceSingle,
        price: thisProduct.priceSingle * thisProduct.amountWidget.value,
        params: thisProduct.prepareCartProductParams(),
      };

      return productSummary;
    }

    prepareCartProductParams() {
      const thisProduct = this;
      console.log('prepareCartProductParams');
      const formData = utils.serializeFormToObject(thisProduct.dom.form);

      const params = {};

      for (let paramId in thisProduct.data.params) {
        const param = thisProduct.data.params[paramId];

        params[paramId] = {
          label: param.label,
          options: {},
        };

        for (let optionId in param.options) {
          const option = param.options[optionId];
          console.log(optionId, option);
          let optionSelected =
            formData[paramId] && formData[paramId].includes(optionId);

          if (optionSelected) {
            params[paramId].options[optionId] = option.label;
          }
        }
      }
      return params;
    }
  }

  class AmountWidget {
    constructor(element) {
      const thisWidget = this;

      thisWidget.getElements(element);
      thisWidget.setValue(
        thisWidget.input.value || settings.amountWidget.defaultValue
      );
      thisWidget.initActions();

      //console.log('AmountWidget:', thisWidget);
      //console.log('construtor arguments', element);
    }

    setValue(value) {
      const thisWidget = this;

      const newValue = parseInt(value);

      //TODO: Add validation
      if (
        thisWidget.value !== newValue &&
        !isNaN(newValue) &&
        newValue >= settings.amountWidget.defaultMin &&
        newValue <= settings.amountWidget.defaultMax
      ) {
        thisWidget.value = newValue;
      }

      thisWidget.input.value = thisWidget.value;
      thisWidget.announce();
    }

    getElements(element) {
      const thisWidget = this;

      thisWidget.element = element;
      thisWidget.input = thisWidget.element.querySelector(
        select.widgets.amount.input
      );
      thisWidget.linkDecrease = thisWidget.element.querySelector(
        select.widgets.amount.linkDecrease
      );
      thisWidget.linkIncrease = thisWidget.element.querySelector(
        select.widgets.amount.linkIncrease
      );
    }

    announce() {
      const thisWidget = this;
      // const event = new Event('updated');
      const event = new CustomEvent('updated', { bubbles: true });

      thisWidget.element.dispatchEvent(event);
    }

    initActions() {
      const thisWidget = this;

      thisWidget.input.addEventListener('change', function () {
        thisWidget.setValue(thisWidget.input.value);
      });

      thisWidget.linkDecrease.addEventListener('click', function (event) {
        event.preventDefault();
        thisWidget.setValue(thisWidget.value - 1);
      });

      thisWidget.linkIncrease.addEventListener('click', function (event) {
        event.preventDefault();
        thisWidget.setValue(thisWidget.value + 1);
      });
    }
  }

  const app = {
    initMenu: function () {
      const thisApp = this;
      ////console.log('thisApp.data:', thisApp.data);
      for (let productData in thisApp.data.products) {
        new Product(
          thisApp.data.products[productData].id,
          thisApp.data.products[productData]
        );
      }
    },

    initData: function () {
      const thisApp = this;

      thisApp.data = {};

      const url = settings.db.url + '/' + settings.db.products;

      fetch(url)
        .then(function (rawResponse) {
          return rawResponse.json();
        })
        .then(function (parsedResponse) {
          console.log('parsedResponse', parsedResponse);

          /* save parsedResponse as thisApp.data.products */
          thisApp.data.products = parsedResponse;
          /*execute initManu method */
          thisApp.initMenu();
        });
      console.log('thisApp.data', JSON.stringify(thisApp.data));
    },

    init: function () {
      const thisApp = this;
      //console.log('*** App starting ***');
      //console.log('thisApp:', thisApp);
      //console.log('classNames:', classNames);
      //console.log('settings:', settings);
      //console.log('templates:', templates);

      thisApp.initData();

      thisApp.initCart();
    },

    initCart: function () {
      const thisApp = this;

      const cartElem = document.querySelector(select.containerOf.cart);
      thisApp.cart = new Cart(cartElem);
    },
  };

  class Cart {
    constructor(element) {
      const thisCart = this;

      thisCart.products = [];

      thisCart.getElements(element);
      thisCart.initActions();

      //console.log('new Cart', thisCart);
    }
    getElements(element) {
      const thisCart = this;

      thisCart.dom = {};

      thisCart.dom.wrapper = element;

      thisCart.dom.toggleTrigger = thisCart.dom.wrapper.querySelector(
        select.cart.toggleTrigger
      );

      thisCart.dom.productList = thisCart.dom.wrapper.querySelector(
        select.cart.productList
      );
      thisCart.dom.deliveryFee = thisCart.dom.wrapper.querySelector(
        select.cart.deliveryFee
      );
      thisCart.dom.subTotalPrice = thisCart.dom.wrapper.querySelector(
        select.cart.subtotalPrice
      );
      thisCart.dom.totalPrice = thisCart.dom.wrapper.querySelectorAll(
        select.cart.totalPrice
      );
      thisCart.dom.totalNumber = thisCart.dom.wrapper.querySelector(
        select.cart.totalNumber
      );

      thisCart.dom.form = thisCart.dom.wrapper.querySelector(select.cart.form);

      thisCart.dom.phone = thisCart.dom.wrapper.querySelector(
        select.cart.phone
      );

      thisCart.dom.address = thisCart.dom.wrapper.querySelector(
        select.cart.address
      );
    }

    initActions() {
      const thisCart = this;

      thisCart.dom.toggleTrigger.addEventListener('click', function () {
        thisCart.dom.wrapper.classList.toggle(classNames.cart.wrapperActive);
      });

      thisCart.dom.productList.addEventListener('updated', function () {
        thisCart.update();
      });

      thisCart.dom.productList.addEventListener('remove', function (event) {
        thisCart.remove(event.detail.cartProduct);
      });

      thisCart.dom.form.addEventListener('submit', function (event) {
        event.preventDefault();
        thisCart.sendOrder();
      });
    }

    add(menuProduct) {
      const thisCart = this;

      const generatedHTML = templates.cartProduct(menuProduct);

      const generatedDOM = utils.createDOMFromHTML(generatedHTML);

      thisCart.dom.productList.appendChild(generatedDOM);

      //  console.log('adding product', menuProduct);

      thisCart.products.push(new CartProduct(menuProduct, generatedDOM));
      console.log('thisCart.products', thisCart.products);

      thisCart.update();
    }

    remove(cartProduct) {
      const thisCart = this;

      const indexOfProductToRemove = thisCart.products.indexOf(cartProduct);

      thisCart.products.splice(indexOfProductToRemove, 1);

      cartProduct.dom.wrapper.remove();
      thisCart.update();
    }

    update() {
      const thisCart = this;

      //Czemu w zadaniu proszono o stałą?
      thisCart.deliveryFee = settings.cart.defaultDeliveryFee;
      thisCart.totalNumber = 0;
      thisCart.subTotalPrice = 0;

      for (let productCart of thisCart.products) {
        thisCart.totalNumber += productCart.amount;
        thisCart.subTotalPrice += productCart.price;

        console.log('product of thisCart.products', productCart);
      }

      if (thisCart.totalNumber === 0) {
        thisCart.totalPrice = 0;
        thisCart.totalPrice = 0;
      } else {
        thisCart.totalPrice = thisCart.subTotalPrice + thisCart.deliveryFee;

        for (let price of thisCart.dom.totalPrice) {
          price.innerHTML = thisCart.totalPrice;
        }
      }

      thisCart.dom.deliveryFee.innerHTML = thisCart.deliveryFee;
      thisCart.dom.subTotalPrice.innerHTML = thisCart.subTotalPrice;
      thisCart.dom.totalPrice.innerHTML = thisCart.totalPrice;
      thisCart.dom.totalNumber.innerHTML = thisCart.totalNumber;

      console.log('thisCart.totalPrice', thisCart.totalPrice);
      console.log('totalNumber', thisCart.totalNumber);
      console.log('totalNumber', thisCart.totalNumber);
    }

    sendOrder() {
      const thisCart = this;

      const url = settings.db.url + '/' + settings.db.orders;

      const payload = {
        address: thisCart.dom.address.value,
        phone: thisCart.dom.phone.value,
        totalPrice: thisCart.totalPrice,
        subTotalPrice: thisCart.subTotalPrice,
        totalNumber: thisCart.totalNumber,
        deliveryFee: thisCart.deliveryFee,
        products: [],
      };

      console.log(payload);

      for (let prod of thisCart.products) {
        payload.products.push(prod.getData());
      }
      console.log('url', url);
      console.log('payload', payload);

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      };

      fetch(url, options)
        .then(function (response) {
          return response.json();
        })
        .then(function (parsedResponse) {
          console.log('parsedResponse', parsedResponse);
        });
    }
  }

  class CartProduct {
    constructor(menuProduct, element) {
      const thisCartProduct = this;

      thisCartProduct.id = menuProduct.id;
      thisCartProduct.name = menuProduct.name;
      thisCartProduct.amount = menuProduct.amount;
      thisCartProduct.priceSingle = menuProduct.priceSingle;
      thisCartProduct.price = menuProduct.price;
      thisCartProduct.params = menuProduct.params;

      thisCartProduct.getElements(element);
      thisCartProduct.initAmountWidget();
      thisCartProduct.initActions();

      //  console.log('new cartProduct', thisCartProduct);
    }

    getElements(element) {
      const thisCartProduct = this;
      thisCartProduct.dom = {};

      thisCartProduct.dom.wrapper = element;

      thisCartProduct.dom.amountWidget = element.querySelector(
        select.cartProduct.amountWidget
      );

      thisCartProduct.dom.price = element.querySelector(
        select.cartProduct.price
      );

      thisCartProduct.dom.edit = element.querySelector(select.cartProduct.edit);

      thisCartProduct.dom.remove = element.querySelector(
        select.cartProduct.remove
      );
    }

    getData() {
      const thisCartProduct = this;

      thisCartProduct.simpleData = {
        id: thisCartProduct.id,
        name: thisCartProduct.name,
        amount: thisCartProduct.amount,
        priceSingle: thisCartProduct.priceSingle,
        price: thisCartProduct.price,
        params: thisCartProduct.params,
      };

      return thisCartProduct.simpleData;
    }

    initAmountWidget() {
      const thisCartProduct = this;

      thisCartProduct.amountWidget = new AmountWidget(
        thisCartProduct.dom.amountWidget
      );

      thisCartProduct.dom.amountWidget.addEventListener('updated', function () {
        thisCartProduct.amount = thisCartProduct.amountWidget.value;

        thisCartProduct.price =
          thisCartProduct.priceSingle * thisCartProduct.amount;

        thisCartProduct.dom.price.innerHTML = thisCartProduct.price;
      });
    }

    remove() {
      const thisCartProduct = this;
      const event = new CustomEvent('remove', {
        bubbles: true,
        detail: {
          cartProduct: thisCartProduct,
        },
      });

      thisCartProduct.dom.wrapper.dispatchEvent(event);

      thisCartProduct.dom.wrapper.remove();
    }

    initActions() {
      const thisCartProduct = this;
      thisCartProduct.dom.edit.addEventListener('click', function (event) {
        event.preventDefault();
      });
      thisCartProduct.dom.remove.addEventListener('click', function (event) {
        event.preventDefault();
        thisCartProduct.remove();
        console.log('remove');
      });
    }
  }

  app.init();
}