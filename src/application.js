(function($) {
	
	var Player = Backbone.Model.extend({
		defaults: {
			id: null,
			name: null,
			hand: null,
			chips: null,
			currentPlayer: null
		}
	});
	
	var Card = Backbone.Model.extend({
		defaults: {
			type: null,
			suit: null,
			color: null,
			label: null,
			symbol: null
		}
	});
	
	var Chip = Backbone.Model.extend({
		defaults: {
			value: 10
		}
	});
	
	var ChipStack = Backbone.Collection.extend({
		model: Chip
	});
	
	var Pot = Backbone.Collection.extend({
		model: Bet
	});
	
	var Bet = Backbone.Model.extend({
		defaults: {
			player: null,
			chips: null
		}
	});
	
	var PlayerList = Backbone.Collection.extend({
		model: Player
	});
	
	var CardList = Backbone.Collection.extend({
		model: Card
	});
	
	/**
	 * Views
	 *
	 */
	
	var ChipStackView = Backbone.View.extend({
		tagName: 'div',
		className: 'playerChips',
		
		initialize: function() {
			_.bindAll(this, 'render');
			
			this.collection.bind('add', this.render);
			this.collection.bind('remove', this.render);
			this.collection.bind('change', this.render);
			
			this.render();
		},
		
		render: function() {
			$(this.el).html('Chips: ' + this.getChipTotal());
			return this;
		},
		
		getChipTotal: function() {
			var total = 0;
			_(this.collection.models).each(function(chip) {
				total += chip.get('value');
			});
			
			return total;
		}
	});
	
	var PlayerView = Backbone.View.extend({
		tagName: 'li',
		className: 'player',
		
		events: {
			'click button#betButton' : 'bet',
			'click button#raiseButton' : 'raise',
			'click button#foldButton' : 'fold',
			'click button#removePlayer' : 'removePlayer'
		},
		
		initialize: function() {
			var self = this;
			_.bindAll(this, 'render', 'unrender', 'remove');
			
			this.model.bind('change', this.render);
			this.model.bind('remove', this.unrender);
			
			if(this.model.get('currentPlayer') && !$(this.el).hasClass('currentPlayer')) {
				$(this.el).addClass('currentPlayer');
			}
			
			this.model.chips = new ChipStack();
			
			for(var i = 0; i < 100; i++) {
				var chip = new Chip();
				this.model.chips.add(chip);
			}
			
			this.model.chips.bind('remove', this.render);
			
			this.chipStack = new ChipStackView({
				collection: this.model.chips
			});
			
			var hand = this.model.get('hand')
			this.handView = new HandView({
				collection: hand
			});
			
			this.render();
		},
		
		render: function() {
			
			$(this.el).html('<span class="playerId">' + this.model.get('id') + '</span><span class="playerName">' + this.model.get('name') + '</span>');
			$(this.el).append(this.chipStack.el);
			
			if(this.model.get('currentPlayer') == true) {
				$(this.el).append('<div id="playerControls"><button id="betButton">Bet</button><button id="raiseButton">Raise</button><button id="foldButton">Fold</button><button id="removePlayer">Leave table</button></div>');
				$('#betButton').focus();
			} else {
				$('#playerControls', this.el).remove();
				//if(this.playerControls) $(this.playerControls).remove();
			}
			
			$(this.el).append(this.handView.el);
			
			return this;
		},
		
		unrender: function(){
			$(this.el).remove();
		},
		
		remove: function(){
			this.model.destroy();
		},
		
		bet: function() {
			
			var chip = this.model.chips.shift(0);
			this.model.chips.remove(chip);
			
			var total = 0;
			total += chip.get('value');
			
			var chipsToBet = new ChipStack();
			chipsToBet.add(chip);
			
			var bet = new Bet({
				player: this.model.get('name'),
				chips: chipsToBet
			});
			
			app.addBet(bet);
			
			this.finishTurn();
			
			this.render();
		},
		
		finishTurn: function() {
			
			var collection = this.model.collection;
			//var prevModel = collection.at(collection.indexOf(this.model) - 1);
			var nextModel = collection.at(collection.indexOf(this.model) + 1);
			if(undefined === nextModel)
			{
				nextModel = collection.at(0);
				
				app.deal();
			}
			
			this.model.set({currentPlayer:false});
			nextModel.set({currentPlayer:true});
		},
		
		raise: function() {
			alert(this.model.get('name') + ' raises');
		},
		
		fold: function() {
			alert(this.model.get('name') + ' folds');
		},
		
		removePlayer: function() {
			alert('remove player');
			app.collection.remove(this.model);
		},
		
		getChipTotal: function() {
			var total = 0;
			var chips = this.model.chips;
			_(chips.models).each(function(chip) {
				var chipValue = chip.get('value');
				total += chipValue;
			});
			return total;
		}
	});
	
	var CardView = Backbone.View.extend({
		tagName: 'li',
		className: 'card',
		
		initialize: function() {
			_.bindAll(this, 'render', 'unrender', 'remove');
			
			this.model.bind('change', this.render);
			this.model.bind('remove', this.unrender);
			
			this.render();
		},
		
		render: function() {
			$(this.el).html(this.model.get('label') + ' of <span style="color:' + this.model.get('color') + '">' + this.model.get('symbol') + '</span>');
			
			return this;
		},
		
		unrender: function(){
			$(this.el).remove();
		},
		
		remove: function(){
			this.model.destroy();
		}
	});
	
	var PotView = Backbone.View.extend({
		tagName: 'div',
		id: 'pot',
		
		initialize: function() {
			_.bindAll(this, 'render');
			
			this.collection = new Pot();
			
			this.collection.bind('change', this.render);
			this.collection.bind('add', this.render);
			this.collection.bind('remove', this.render);
			
			this.render();
		},
		
		render: function() {
			$(this.el).html('$' + this.getPotTotal());
			
			return this;
		},
		
		getPotTotal: function() {
			var total = 0;
			_(this.collection.models).each(function(bet) {
				var chips = bet.get('chips');
				var betValue = 0;
				_(chips.models).each(function(chip) {
					var chipValue = chip.get('value');
					total += chipValue;
				});
			});
			return total;
		}
	});
	
	var HandView = Backbone.View.extend({
		tagName: 'ul',
		className: 'hand',
		
		initialize: function() {
			_.bindAll(this, 'render', 'appendCard');
			
			this.collection.bind('change', this.render);
			this.collection.bind('add', this.appendCard);
			
			this.render();
		},
		
		render: function() {
			var self = this;
			
			_(this.collection.models).each(function(card) {
				self.appendCard(card);
			}, this);
			
			return this;
		},
		
		appendCard: function(card) {
			
			var cardView = new CardView({
				model: card
			});
			$(this.el).append(cardView.el);
		}
	});
	
	var CommunalCards = Backbone.View.extend({
		tagName: 'ul',
		id: 'communalCards',
		
		initialize: function() {
			_.bindAll(this, 'render', 'appendCard');
			
			this.collection.bind('change', this.render);
			this.collection.bind('add', this.appendCard);
			
			this.render();
		},
		
		render: function() {
			var self = this;
			
			_(this.collection.models).each(function(card) {
				self.appendCard(card);
			}, this);
			
			return this;
		},
		
		appendCard: function(card) {
			var cardView = new CardView({
				model: card
			});
			
			$(this.el).append(cardView.el);
		}
	});
	
	var PlayerListView = Backbone.View.extend({
		tagName: 'ul',
		id: 'players',
		
		initialize: function() {
			_.bindAll(this, 'render', 'addPlayer', 'appendPlayer');
			
			this.collection = new PlayerList();
			
			this.collection.bind('add', this.appendPlayer);
			
			this.render();
		},
		
		render: function() {
			var self = this;
			
			_(this.collection.models).each(function(player) {
				self.appendPlayer(player);
			}, this);
			
			return this;
		},
		
		addPlayer: function() {
			var player = new Player({
				id: this.collection.length,
				name: $('#nameField').val(),
				hand: new CardList(),
				chips: null,
				currentPlayer: false
			});
			
			this.collection.add(player);
			
			if(this.collection.length > 1) {
				$('button#deal').css('display', 'inline');
			} else {
				$('button#deal').css('display', 'none');
			}
			
			$('#nameField').val('');
			$('#nameField').focus();
		},
		
		appendPlayer: function(player) {
			
			var playerView = new PlayerView({
				model:player
			});
			
			$(this.el).append(playerView.el);
		},
		
		setCurrentPlayer: function(index) {
			this.collection.at(index).set({'currentPlayer':true});
		}
	});
	
	/**
	 * Deck
	 */
	
	
	
	var Deck = Backbone.View.extend({
		tagName: 'ul',
		id: 'deck',
		
		initialize: function() {
			_.bindAll(this, 'render', 'addCard', 'appendCard');
			
			this.collection = new CardList();
			
			this.collection.bind('add', this.appendCard);
			this.collection.bind('change', this.render);
			
			this.suits = ['hearts', 'clubs', 'diamonds', 'spades'];
			
			this.createDeck();
			
			this.shuffle();
			
			this.render();
		},
		
		createDeck: function() {
			for(var s = 0; s < this.suits.length; s++) {
				var suit = this.suits[s];
				for(var i = 1; i < 14; i++) {
					this.addCard(i, suit);
				}
			}
		},
		
		render: function() {
			var self = this;
			
			_(this.collection.models).each(function(card) {
				self.appendCard(card);
			}, this);
			
			return this;
		},
		
		shuffle: function() {
			this.collection.reset(this.collection.shuffle(), {silent:true});
		},
		
		addCard: function(t, s) {
			var card = new Card();
			var type = t;
			var suit = s;
			var label;
			var color;
			var symbol;
			
			switch(type) {
				case 11:
					label = 'J';
					break;
				case 12:
					label = 'Q';
					break;
				case 13:
					label = 'K';
					break;
				case 1:
					label = 'A';
					break;
				default:
					label = t;
			}
			
			switch(suit) {
				case 'diamonds':
				case 'hearts':
					color = '#f00';
					break;
				default:
					color = '#000';
			}
			
			switch(suit) {
				case 'spades':
					symbol = '&spades;';
					break;
				case 'diamonds':
					symbol = '&diams;';
					break;
				case 'hearts':
					symbol = '&hearts;';
					break;
				case 'clubs':
					symbol = '&clubs;';
					break;
			}
			
			card.set({
				type: type,
				suit: s,
				label: label,
				color: color,
				symbol: symbol
			});
			
			this.collection.add(card);
		},
		
		appendCard: function(card) {
			var cardView = new CardView({
				model: card
			});
			$(this.el).append(cardView.el);
		}
	});
	
	var Dealer = Backbone.View.extend({
		tagName: 'div',
		id: 'dealer',
		
		initialize: function() {
			_.bindAll(this, 'render');
			
			this.render();
		},
		
		render: function() {
			$(this.el).html('<h2>Dealer</h2>');
			
			return this;
		}
	});
	
	
	/** 
	 * Start Game
	 */
	
	var App = Backbone.View.extend({
		el: '#game',
		
		events: {
			'click button#addPlayer': 'addPlayer',
			'click button#deal': 'deal',
			'click button#restart': 'restart'
		},
		
		initialize: function() {
			
			_.bindAll(this, 'render', 'addPlayer');
			
			this.playerList = new PlayerListView();
			
			this.communalCardList = new CardList();
			
			this.communalCards = new CommunalCards({
				collection: this.communalCardList
			});
			
			this.potView = new PotView();
			
			this.dealerView = new Dealer();
			
			this.deck = new Deck();
			
			this.stages = ['Cards', 'Flop', 'Turn', 'River'];
			this.stage = 0;
			
			this.intervals = [];
			
			this.playing = false;
			
			this.render();
			
			$('#nameField').focus();
		},
		
		render: function() {
			
			$(this.el).append(	'<div id="newPlayerModule">' + 
									'<h2>Player\'s name:</h2>' + 
									'<input id="nameField" /> ' + 
									'<button id="addPlayer">Add Player</button>' + 
								'</div>' + 
								'<div id="controls">' + 
									'<button id="deal" style="display:none">Deal ' + this.stages[this.stage] + '</button>' + 
									'<button id="restart" style="display:none">Restart</button>' + 
								'</div>');
			
			if(this.playerList.collection.length > 1) {
				$('#newPlayerModule', this.el).append('<button id="deal" style="display:none">Deal ' + this.stages[this.stage] + '</button>');
			}
			
			$(this.el).append(	this.playerList.el);
			$(this.el).append(	this.potView.el);
			$(this.el).append(	this.communalCards.el);
			$(this.el).append(	this.dealerView.el);
			$(this.el).append(	this.deck.el);
			
			return this;
		},
		
		addPlayer: function() {
			this.playerList.addPlayer();
		},
		
		deal: function() {
			//$('button#deal').css('display', 'none');
			this.playing = true;
			
			$('#newPlayerModule').css('display', 'none');
			
			var self = this;
			this.numCards = null;
			//if(this.stage >= this.stages.length) return;
			
			this.playerList.setCurrentPlayer(0);
			
			if(this.stage == 0) this.numCards = 2;
			else if(this.stage == 1) this.numCards = 3;
			else this.numCards = 1;
			
			if(this.stage > 0) {
				for(var i = 0; i < this.numCards; i++) {
					var duration = 1000 * i;
					
					var interval = setInterval(function() {
						clearInterval(self.intervals.splice(0, 1)[0]);
						self.dealCommunalCard();
					}, duration);
					this.intervals.push(interval);
				}
			} else {
				for(var i = 0; i < this.numCards; i++) {
					_(this.playerList.collection.models).each(function(player) {
							self.dealCard(player);
					}, this);
				}
			}
			
			this.stage++;
			this.numCards = null;
			
			if(this.stage == this.stages.length) {
				$('button#restart').css('display', 'inline');
				$('button#restart').focus();
				$('button#deal').css('display', 'none');
				
				_(this.playerList.collection.models).each(function(model) {
					model.set({currentPlayer:true});
				});
				this.playing = false;
			} else {
				$('button#restart').css('display', 'none');
				$('button#deal').html('Deal ' + this.stages[this.stage]);
			}
		},
		
		dealCard: function(player) {
			var hand = player.get('hand');
			var topCard = this.deck.collection.at(0);
			//alert('dealing ' + topCard.get('label') + ' of ' + topCard.get('suit') + ' to ' + player.get('name'));
			this.deck.collection.remove(topCard);
			hand.add(topCard);
		},
		
		dealCommunalCard: function() {
			var topCard = this.deck.collection.at(0);
			//alert('dealing ' + topCard.get('label') + ' of ' + topCard.get('suit') + ' to ' + player.get('name'));
			this.deck.collection.remove(topCard);
			this.communalCardList.add(topCard);
		},
		
		returnCards: function() {
			var self = this;
			_(this.playerList.collection.models).each(function(player) {
				var hand = player.get('hand');
				
				while(hand.length) {
					var card = hand.at(0);
					hand.remove(card);
					self.deck.collection.add(card);
				}
			}, this);
			
			while(this.communalCardList.length) {
				var card = this.communalCardList.at(0);
				this.communalCardList.remove(card);
				this.deck.collection.add(card);
			}
		},
		
		addBet: function(bet) {
			this.potView.collection.add(bet);
		},
		
		restart: function() {
			$('#newPlayerModule').css('display', 'block');
			$('#restart').css('display', 'none');
			$('button#deal').css('display', 'block');
			$('button#deal').focus();
			this.returnCards();
			this.stage = 0;
			$('button#deal').html('Deal ' + this.stages[this.stage]);
		}
	});
	
	var app = new App();
	$('#game').append(app.el);
	
})(jQuery);